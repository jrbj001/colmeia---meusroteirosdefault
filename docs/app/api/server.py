#!/usr/bin/env python3
"""API JSON do simulador Indoor + serve o bundle React (web/dist).

Espelha a arquitetura da Colmeia: frontend React -> API -> sp_indoorResultadoInsert -> resultados.
Reaproveita pyodbc (código já validado). Escreve nas tabelas de PRODUÇÃO indoor (autorizado,
ainda não consumidas); simulações isoladas em report_pk >= 900000.

Endpoints:
  GET  /api/dims               -> dimensões p/ os dropdowns
  POST /api/simular            -> {praca, linhas:[...]}  grava + roda a SP, devolve {report_pk}
  GET  /api/resultado?rep=N    -> {config, detalhe, agregado}
  POST /api/reset              -> limpa simulações (report_pk >= 900000)
  GET  /  (e estáticos)        -> web/dist (SPA)

Rodar:  python3 api/server.py     (precisa web/dist buildado: cd web && npm run build)
        INDOOR_SIM_PORT=8200 python3 api/server.py
"""
import json
import mimetypes
import os
import urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
import pyodbc

HERE = os.path.dirname(os.path.abspath(__file__))
ENV = os.path.join(HERE, "..", "..", "..", "..", "..", ".env")
DIST = os.path.abspath(os.path.join(HERE, "..", "web", "dist"))
S = "serv_product_be180"
SIM_MIN = 900000
PORT = int(os.environ.get("INDOOR_SIM_PORT", "8137"))


def load_env():
    d = {}
    with open(ENV, encoding="utf-8") as fh:
        for ln in fh:
            ln = ln.strip()
            if ln and not ln.startswith("#") and "=" in ln:
                k, v = ln.split("=", 1)
                d[k.strip()] = v.strip().strip('"').strip("'")
    return d


ENVV = load_env()
DB_U = ENVV.get("BE180_USER_MASTER", ENVV["BE180_USER"])
DB_P = ENVV.get("BE180_PASSWORD_MASTER", ENVV["BE180_PASSWORD"])
CONNSTR = (f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={ENVV['BE180_SERVER']};"
           f"DATABASE={ENVV['BE180_DATABASE']};UID={DB_U};PWD={DB_P};"
           f"Encrypt=yes;TrustServerCertificate=yes;Connection Timeout=30")


def db():
    return pyodbc.connect(CONNSTR, autocommit=True)


# ---------------- handlers de dados ----------------
def get_dims():
    with db() as cn:
        c = cn.cursor()
        ambientes = [{"nome": r[0], "ehShopping": bool(r[1]), "tamanhoOverride": r[2] or ""}
                     for r in c.execute(f"SELECT ambiente_st,ehShopping_bl,ISNULL(tamanhoOverride_st,'') "
                                        f"FROM {S}.indoorAmbiente_dm ORDER BY ambiente_st")]
        tamanhos = [r[0] for r in c.execute(f"SELECT tamanho_st FROM {S}.indoorFormatoTamanho_dm ORDER BY multiplicador_vl")]
        visualizacoes = [r[0] for r in c.execute(f"SELECT visualizacao_st FROM {S}.indoorVisualizacao_dm ORDER BY visualizacao_st")]
        shoppings = [r[0] for r in c.execute(f"SELECT shopping_st FROM {S}.indoorShopping_dm ORDER BY shopping_st")]
        cidades = [r[0] for r in c.execute(f"SELECT TOP 80 cidade_st FROM {S}.cidadeClassIbgeKantar_dm_vw "
                                           f"ORDER BY cityPopulationEstimatedIBGE DESC")]
        deflatorDigital = [{"min": int(r[0]), "mult": float(r[1])} for r in c.execute(
            f"SELECT insercoesMin_vl, multiplicador_vl FROM {S}.indoorDeflatorDigital_dm ORDER BY insercoesMin_vl")]
    return {"ambientes": ambientes, "tamanhos": tamanhos, "visualizacoes": visualizacoes,
            "shoppings": shoppings, "cidades": cidades, "deflatorDigital": deflatorDigital}


def _numf(v):
    try:
        return float(v) if v not in (None, "") else None
    except (ValueError, TypeError):
        return None


def post_simular(body):
    praca = (body.get("praca") or "").strip()
    semanas = max(1, min(12, int(body.get("semanas") or 12)))   # nº de semanas ativas (W1..N)
    linhas = [l for l in body.get("linhas", []) if (l.get("ambiente") or "").strip()]
    if not praca or not linhas:
        return {"error": "Informe a praça e ao menos um ambiente."}, 400
    with db() as cn:
        c = cn.cursor()
        rep = c.execute(f"SELECT ISNULL(MAX(report_pk),{SIM_MIN})+1 FROM {S}.planoIndoorLinha_ft "
                        f"WHERE report_pk>={SIM_MIN}").fetchval()
        for l in linhas:
            pk = c.execute(
                f"INSERT INTO {S}.planoIndoorLinha_ft (planoMidiaGrupo_pk,report_pk,praca_st,ambiente_st,"
                f"shopping_st,tamanhoFormato_st,circulacao_st,tipo_st,passantesManual_vl,insercoesPorSlot_vl,slots_vl) "
                f"OUTPUT INSERTED.pk VALUES (?,?,?,?,?,?,?,?,?,?,?)",
                rep, rep, praca, l["ambiente"].strip(), (l.get("shopping") or "").strip() or None,
                (l.get("tamanho") or "").strip() or None, (l.get("circulacao") or "").strip() or None,
                (l.get("tipo") or "Estático").strip(), _numf(l.get("passantes")),
                _numf(l.get("insps")), _numf(l.get("slots"))).fetchval()
            locs = l.get("locs") or []                   # localidades por semana (W1..N); espelha H12:H23
            for w in range(1, 13):
                val = int(_numf(locs[w - 1]) or 0) if (w <= semanas and (w - 1) < len(locs)) else 0
                c.execute(f"INSERT INTO {S}.planoIndoorLocalidadeSemana_ft (linha_pk,semana_vl,localidades_vl) "
                          f"VALUES (?,?,?)", int(pk), w, val)
        c.execute(f"EXEC {S}.sp_indoorResultadoInsert @planoMidiaGrupo_pk=?,@report_pk=?", rep, rep)
    return {"report_pk": rep}, 200


def get_resultado(rep):
    with db() as cn:
        c = cn.cursor()
        config = [dict(zip(["linha_pk", "ambiente", "tipo", "shopping", "tamanho", "circulacao", "praca"], r)) for r in c.execute(
            f"SELECT pk,ambiente_st,tipo_st,ISNULL(shopping_st,''),ISNULL(tamanhoFormato_st,''),"
            f"ISNULL(circulacao_st,''),praca_st FROM {S}.planoIndoorLinha_ft WHERE report_pk=? ORDER BY pk", rep)]
        detalhe = [dict(zip(["linha_pk", "ambiente_st", "semana_vl", "impacto_vl", "frequencia_vl", "cobertura_vl",
                             "ipvAjustadoShopping_vl", "ipvAjustadoDemais_vl"], r)) for r in c.execute(
            f"SELECT linha_pk,ambiente_st,semana_vl,impacto_vl,frequencia_vl,cobertura_vl,ipvAjustadoShopping_vl,ipvAjustadoDemais_vl "
            f"FROM {S}.indoorResultado_ft WHERE report_pk=? ORDER BY linha_pk,semana_vl", rep)]
        agregado = [dict(zip(["praca_st", "semana_vl", "impactoTotal_vl", "coberturaTotal_vl",
                              "frequencia_vl", "pctCobertura_vl"], r)) for r in c.execute(
            f"SELECT praca_st,semana_vl,impactoTotal_vl,coberturaTotal_vl,frequencia_vl,pctCobertura_vl "
            f"FROM {S}.indoorResultadoAgregado_ft_vw WHERE report_pk=? ORDER BY praca_st,semana_vl", rep)]
        # deflatores aplicados por linha — espelha o CTE 'resolvido' de indoorCalculo_ft_vw (read-only)
        deflatores = [dict(zip(["linha_pk", "ipv_vl", "regiaoTgi_st", "freqBase_vl", "tamanhoEfetivo_st",
                                "defTamanho_vl", "defVisualizacao_vl", "defDigital_vl", "defConcentracao_vl",
                                "passantes_vl"], r)) for r in c.execute(f"""
            SELECT l.pk,
                amb.ipv_vl,
                geo.regiaoTgi_st,
                freq.frequencia_vl,
                COALESCE(amb.tamanhoOverride_st, l.tamanhoFormato_st),
                tam.multiplicador_vl,
                vis.multiplicador_vl,
                CASE WHEN l.tipo_st = N'Estático' THEN 1.0 ELSE ISNULL(dig.multiplicador_vl, 1.0) END,
                CASE WHEN amb.ehShopping_bl = 1 THEN ISNULL(conc.multiplicador_vl, 1.0) ELSE 1.0 END,
                CASE WHEN amb.ehShopping_bl = 1 THEN shPass.passantesSemana_vl ELSE l.passantesManual_vl END
            FROM {S}.planoIndoorLinha_ft l
            JOIN {S}.indoorAmbiente_dm amb ON amb.ambiente_st = l.ambiente_st
            OUTER APPLY (SELECT TOP 1 COALESCE(cc.regionSpecific, cc.region) AS regiaoTgi_st
                         FROM {S}.cidadeClassIbgeKantar_dm_vw cc
                         WHERE cc.cidade_st = UPPER(l.praca_st) COLLATE Latin1_General_CI_AI
                         ORDER BY cc.cityPopulationEstimatedIBGE DESC) geo
            LEFT JOIN {S}.indoorFrequenciaAmbiente_dm freq ON freq.regiaoTgi_st = geo.regiaoTgi_st AND freq.ambiente_st = l.ambiente_st
            LEFT JOIN {S}.indoorFormatoTamanho_dm tam ON tam.tamanho_st = COALESCE(amb.tamanhoOverride_st, l.tamanhoFormato_st)
            LEFT JOIN {S}.indoorVisualizacao_dm vis ON vis.visualizacao_st = l.circulacao_st
            OUTER APPLY (SELECT TOP 1 sp.passantesSemana_vl FROM {S}.indoorShopping_dm sp
                         WHERE amb.ehShopping_bl = 1 AND sp.shopping_st = l.shopping_st ORDER BY sp.passantesSemana_vl DESC) shPass
            OUTER APPLY (SELECT TOP 1 sa.area_vl FROM {S}.indoorShopping_dm sa
                         WHERE amb.ehShopping_bl = 1 AND sa.cidade_st = l.praca_st AND sa.shopping_st = l.shopping_st) shArea
            OUTER APPLY (SELECT TOP 1 dd.multiplicador_vl FROM {S}.indoorDeflatorDigital_dm dd
                         WHERE dd.insercoesMin_vl <= ISNULL(l.insercoesPorSlot_vl,0) * ISNULL(l.slots_vl,0) ORDER BY dd.insercoesMin_vl DESC) dig
            OUTER APPLY (SELECT TOP 1 cf.multiplicador_vl FROM {S}.indoorConcentracaoFaixa_dm cf
                         WHERE cf.pessoasM2Min_vl IS NOT NULL
                           AND cf.pessoasM2Min_vl <= (CASE WHEN shArea.area_vl > 0 THEN shPass.passantesSemana_vl / shArea.area_vl ELSE 0 END)
                         ORDER BY cf.pessoasM2Min_vl DESC) conc
            WHERE l.report_pk = ? ORDER BY l.pk""", rep)]
    return {"config": config, "detalhe": detalhe, "agregado": agregado, "deflatores": deflatores}


def post_reset():
    with db() as cn:
        c = cn.cursor()
        c.execute(f"DELETE FROM {S}.indoorResultado_ft WHERE report_pk>={SIM_MIN}")
        c.execute(f"DELETE w FROM {S}.planoIndoorLocalidadeSemana_ft w JOIN {S}.planoIndoorLinha_ft l "
                  f"ON w.linha_pk=l.pk WHERE l.report_pk>={SIM_MIN}")
        c.execute(f"DELETE FROM {S}.planoIndoorLinha_ft WHERE report_pk>={SIM_MIN}")
    return {"ok": True}


# ---------------- HTTP ----------------
class H(BaseHTTPRequestHandler):
    def _json(self, obj, code=200):
        b = json.dumps(obj, default=float).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def _static(self, path):
        # SPA: serve arquivo de web/dist, fallback index.html
        rel = path.lstrip("/") or "index.html"
        fp = os.path.join(DIST, rel)
        if not os.path.isfile(fp):
            fp = os.path.join(DIST, "index.html")
        if not os.path.isfile(fp):
            self._json({"error": "web/dist não encontrado — rode: cd web && npm install && npm run build"}, 503)
            return
        ctype = mimetypes.guess_type(fp)[0] or "application/octet-stream"
        with open(fp, "rb") as f:
            b = f.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_OPTIONS(self):
        self._json({}, 200)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path)
        try:
            if u.path == "/api/dims":
                self._json(get_dims())
            elif u.path == "/api/resultado":
                rep = int(urllib.parse.parse_qs(u.query).get("rep", ["0"])[0])
                self._json(get_resultado(rep))
            else:
                self._static(u.path)
        except Exception as e:
            self._json({"error": str(e)}, 500)

    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        n = int(self.headers.get("Content-Length", 0))
        raw = self.rfile.read(n).decode("utf-8") if n else "{}"
        try:
            if u.path == "/api/simular":
                obj, code = post_simular(json.loads(raw))
                self._json(obj, code)
            elif u.path == "/api/reset":
                self._json(post_reset())
            else:
                self._json({"error": "not found"}, 404)
        except Exception as e:
            self._json({"error": str(e)}, 500)

    def log_message(self, *a):
        pass


if __name__ == "__main__":
    print(f"Indoor API+web em http://localhost:{PORT}  (DB {ENVV['BE180_SERVER']} como {DB_U})")
    print(f"servindo bundle de: {DIST}" + ("" if os.path.isdir(DIST) else "  [AINDA NÃO BUILDADO — cd web && npm run build]"))
    HTTPServer(("127.0.0.1", PORT), H).serve_forever()
