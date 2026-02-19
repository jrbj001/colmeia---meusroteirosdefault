const { getPool } = require('./db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { desc_pk } = req.query;

    if (!desc_pk) {
      return res.status(400).json({ error: 'desc_pk é obrigatório' });
    }

    console.log(`📍 [API pontos-midia] Recebido desc_pk: ${desc_pk}`);

    const pool = await getPool();
    
    const planoMidiaResult = await pool.request()
      .input('desc_pk', desc_pk)
      .query(`
        SELECT pk FROM serv_product_be180.planoMidia_dm_vw
        WHERE planoMidiaDesc_vl = @desc_pk
      `);

    if (!planoMidiaResult.recordset || planoMidiaResult.recordset.length === 0) {
      return res.status(200).json({ pontos: [] });
    }

    const planoMidiaPks = planoMidiaResult.recordset.map(r => r.pk);
    
    console.log(`📍 [API pontos-midia] planoMidia_pks para desc_pk ${desc_pk}:`, planoMidiaPks);
    
    const gruposRequest = pool.request();
    const grupoPkParams = planoMidiaPks.map((pk, i) => {
      gruposRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');

    const gruposHexagonosResult = await gruposRequest.query(`
      SELECT DISTINCT grupo_st
      FROM serv_product_be180.BaseCalculadoraHexagonosJoin_dm
      WHERE planoMidia_pk IN (${grupoPkParams})
        AND grupo_st IS NOT NULL
        AND grupo_st != ''
    `);
    
    const gruposHexagonos = gruposHexagonosResult.recordset.map(r => r.grupo_st);
    console.log(`📍 [API pontos-midia] Grupos dos hexágonos:`, gruposHexagonos);
    
    if (gruposHexagonos.length === 0) {
      console.log(`📍 [API pontos-midia] Nenhum grupo encontrado nos hexágonos, retornando pontos vazios`);
      return res.status(200).json({ pontos: [] });
    }
    
    const pontosRequest = pool.request();
    const pontosPkParams = planoMidiaPks.map((pk, i) => {
      pontosRequest.input(`pk${i}`, pk);
      return `@pk${i}`;
    }).join(',');
    const gruposParams = gruposHexagonos.map((g, i) => {
      pontosRequest.input(`grupo${i}`, g);
      return `@grupo${i}`;
    }).join(',');

    const result = await pontosRequest.query(`
      SELECT *
      FROM serv_product_be180.baseCalculadoraLastPlanoMidia_ft_vw
      WHERE planoMidia_pk IN (${pontosPkParams})
        AND grupo_st IN (${gruposParams})
    `);
    
    console.log(`📍 [API pontos-midia] Total de pontos retornados (filtrados por grupos): ${result.recordset.length}`);
    
    // Garantir que o grupoSub_st derive do grupo_st
    // IMPORTANTE: O subgrupo DEVE começar com o código do grupo
    // Ex: grupo_st = "G1" → grupoSub_st deve ser "G1D", "G1E", "G1MD", etc.
    const pontosProcessados = result.recordset
      .map(ponto => {
        // Se não tem grupo_st, não podemos processar
        if (!ponto.grupo_st) {
          console.warn(`⚠️ [API pontos-midia] Ponto ${ponto.planoMidia_pk} sem grupo_st, será filtrado`);
          return null;
        }
        
        // Se não tem grupoSub_st, vamos derivar do grupo baseado no tipo (Digital/Estático)
        if (!ponto.grupoSub_st) {
          const tipo = ponto.estaticoDigital_st || 'D';
          const novoSubgrupo = `${ponto.grupo_st}${tipo}`;
          console.log(`🔧 [API pontos-midia] Derivando subgrupo para ponto ${ponto.planoMidia_pk}: ${novoSubgrupo} (tipo: ${tipo})`);
          return {
            ...ponto,
            grupoSub_st: novoSubgrupo
          };
        }
        
        // Verificar se o subgrupo pertence ao grupo
        // O subgrupo DEVE começar com o código do grupo
        if (!ponto.grupoSub_st.startsWith(ponto.grupo_st)) {
          console.warn(`⚠️ [API pontos-midia] Ponto ${ponto.planoMidia_pk}: subgrupo "${ponto.grupoSub_st}" não deriva do grupo "${ponto.grupo_st}"`);
          
          // Tentar derivar o subgrupo do grupo + tipo
          const tipo = ponto.estaticoDigital_st || 'D';
          const novoSubgrupo = `${ponto.grupo_st}${tipo}`;
          console.log(`🔧 [API pontos-midia] Corrigindo subgrupo: "${ponto.grupoSub_st}" → "${novoSubgrupo}"`);
          
          return {
            ...ponto,
            grupoSub_st: novoSubgrupo
          };
        }
        
        // Subgrupo válido, retornar como está
        return ponto;
      })
      .filter(ponto => ponto !== null); // Remover pontos inválidos
    
    if (pontosProcessados.length > 0) {
      // ANÁLISE DETALHADA DOS CAMPOS DISPONÍVEIS
      const primeiroPonto = pontosProcessados[0];
      
      console.log(`\n🔍 [ANÁLISE COMPLETA] Estrutura do primeiro ponto:`);
      console.log(`   Total de campos: ${Object.keys(primeiroPonto).length}`);
      console.log(`   Todos os campos:`, Object.keys(primeiroPonto).sort().join(', '));
      
      // VERIFICAÇÃO DAS CORES DO PONTO
      console.log(`\n🎨 [CORES DO PONTO] Verificando campos de cor:`);
      console.log(`   - hexColor_st: ${primeiroPonto.hexColor_st || 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorR_vl: ${primeiroPonto.rgbColorR_vl !== null && primeiroPonto.rgbColorR_vl !== undefined ? primeiroPonto.rgbColorR_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorG_vl: ${primeiroPonto.rgbColorG_vl !== null && primeiroPonto.rgbColorG_vl !== undefined ? primeiroPonto.rgbColorG_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - rgbColorB_vl: ${primeiroPonto.rgbColorB_vl !== null && primeiroPonto.rgbColorB_vl !== undefined ? primeiroPonto.rgbColorB_vl : 'NULL/UNDEFINED'}`);
      
      // Análise de quantos pontos têm cores
      const pontosComHexColor = pontosProcessados.filter(p => p.hexColor_st).length;
      const pontosComRGB = pontosProcessados.filter(p => 
        p.rgbColorR_vl !== null && p.rgbColorR_vl !== undefined &&
        p.rgbColorG_vl !== null && p.rgbColorG_vl !== undefined &&
        p.rgbColorB_vl !== null && p.rgbColorB_vl !== undefined
      ).length;
      console.log(`\n🎨 [ESTATÍSTICAS COR] Pontos com cores:`);
      console.log(`   - Com hexColor_st: ${pontosComHexColor}/${pontosProcessados.length} (${((pontosComHexColor/pontosProcessados.length)*100).toFixed(1)}%)`);
      console.log(`   - Com RGB completo: ${pontosComRGB}/${pontosProcessados.length} (${((pontosComRGB/pontosProcessados.length)*100).toFixed(1)}%)`);
      
      // Listar TODOS os campos relacionados a fluxo
      const camposFluxo = Object.keys(primeiroPonto).filter(k => 
        k.toLowerCase().includes('fluxo') || 
        k.toLowerCase().includes('flow') ||
        k.toLowerCase().includes('passante')
      );
      console.log(`\n📊 [ANÁLISE] Campos relacionados a fluxo encontrados (${camposFluxo.length}):`);
      camposFluxo.forEach(campo => {
        const valor = primeiroPonto[campo];
        const tipo = typeof valor;
        const temValor = valor !== null && valor !== undefined && valor !== '';
        console.log(`   - ${campo}: ${temValor ? valor : 'N/A'} (tipo: ${tipo})`);
      });
      
      // Análise específica dos campos conhecidos
      console.log(`\n🔍 [ANÁLISE DETALHADA] Valores dos campos de fluxo conhecidos:`);
      console.log(`   - fluxo_vl: ${primeiroPonto.fluxo_vl !== null && primeiroPonto.fluxo_vl !== undefined ? primeiroPonto.fluxo_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - fluxoPassantes_vl: ${primeiroPonto.fluxoPassantes_vl !== null && primeiroPonto.fluxoPassantes_vl !== undefined ? primeiroPonto.fluxoPassantes_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - fluxoEstimado_vl: ${primeiroPonto.fluxoEstimado_vl !== null && primeiroPonto.fluxoEstimado_vl !== undefined ? primeiroPonto.fluxoEstimado_vl : 'NULL/UNDEFINED'}`);
      console.log(`   - calculatedFluxoEstimado_vl: ${primeiroPonto.calculatedFluxoEstimado_vl !== null && primeiroPonto.calculatedFluxoEstimado_vl !== undefined ? primeiroPonto.calculatedFluxoEstimado_vl : 'NULL/UNDEFINED'}`);
      
      // Contar por Grupo (não mais por SubGrupo isolado)
      const porGrupo = pontosProcessados.reduce((acc, p) => {
        const grupo = p.grupo_st || 'Sem Grupo';
        acc[grupo] = (acc[grupo] || 0) + 1;
        return acc;
      }, {});
      console.log(`📍 [API pontos-midia] Pontos por Grupo:`, porGrupo);
      
      // Contar por SubGrupo (agora derivado do grupo)
      const porSubGrupo = pontosProcessados.reduce((acc, p) => {
        const sub = p.grupoSub_st || 'Sem SubGrupo';
        acc[sub] = (acc[sub] || 0) + 1;
        return acc;
      }, {});
      console.log(`📍 [API pontos-midia] Pontos por SubGrupo:`, porSubGrupo);
      
      // Contar por tipo (Digital/Estático)
      const porTipo = pontosProcessados.reduce((acc, p) => {
        const tipo = p.estaticoDigital_st || 'Sem Tipo';
        acc[tipo] = (acc[tipo] || 0) + 1;
        return acc;
      }, {});
      console.log(`📍 [API pontos-midia] Pontos por Tipo:`, porTipo);
      
      // Estatísticas de fluxo dos PONTOS - ANÁLISE COMPLETA E CORRIGIDA
      const fluxosReais = pontosProcessados
        .map(p => {
          // Verificar se o campo existe e tem valor válido (não null, não undefined, não 0 se for o único)
          const fluxoVl = (p.fluxo_vl !== null && p.fluxo_vl !== undefined) ? p.fluxo_vl : null;
          const fluxoPassantes = (p.fluxoPassantes_vl !== null && p.fluxoPassantes_vl !== undefined) ? p.fluxoPassantes_vl : null;
          return fluxoVl || fluxoPassantes || null;
        })
        .filter(f => f !== null && f > 0);
      
      const fluxosEstimados = pontosProcessados
        .map(p => (p.fluxoEstimado_vl !== null && p.fluxoEstimado_vl !== undefined) ? p.fluxoEstimado_vl : null)
        .filter(f => f !== null && f > 0);
      
      const fluxosCalculados = pontosProcessados
        .map(p => (p.calculatedFluxoEstimado_vl !== null && p.calculatedFluxoEstimado_vl !== undefined) ? p.calculatedFluxoEstimado_vl : null)
        .filter(f => f !== null && f > 0);
      
      // Contar quantos pontos têm cada tipo de fluxo
      const pontosComFluxoReal = pontosProcessados.filter(p => 
        (p.fluxo_vl !== null && p.fluxo_vl !== undefined && p.fluxo_vl > 0) ||
        (p.fluxoPassantes_vl !== null && p.fluxoPassantes_vl !== undefined && p.fluxoPassantes_vl > 0)
      ).length;
      
      const pontosComFluxoEstimado = pontosProcessados.filter(p => 
        p.fluxoEstimado_vl !== null && p.fluxoEstimado_vl !== undefined && p.fluxoEstimado_vl > 0
      ).length;
      
      const pontosComFluxoCalculado = pontosProcessados.filter(p => 
        p.calculatedFluxoEstimado_vl !== null && p.calculatedFluxoEstimado_vl !== undefined && p.calculatedFluxoEstimado_vl > 0
      ).length;
      
      console.log(`\n📊 [ANÁLISE FLUXO] Estatísticas dos pontos (${pontosProcessados.length} total):`);
      console.log(`   ┌─────────────────────────────────────────────────────────────┐`);
      if (fluxosReais.length > 0) {
        const min = Math.min(...fluxosReais);
        const max = Math.max(...fluxosReais);
        const media = fluxosReais.reduce((a, b) => a + b, 0) / fluxosReais.length;
        console.log(`   │ Fluxo Real (fluxo_vl/fluxoPassantes_vl)                  │`);
        console.log(`   │   Min: ${min.toLocaleString('pt-BR')}, Max: ${max.toLocaleString('pt-BR')}      │`);
        console.log(`   │   Média: ${media.toFixed(0).toLocaleString('pt-BR')}, Total: ${fluxosReais.length}/${pontosProcessados.length} pontos (${((fluxosReais.length/pontosProcessados.length)*100).toFixed(1)}%) │`);
      } else {
        console.log(`   │ ⚠️  Nenhum ponto com fluxo real (fluxo_vl/fluxoPassantes_vl) │`);
        console.log(`   │    Pontos com fluxo_vl: ${pontosProcessados.filter(p => p.fluxo_vl !== null && p.fluxo_vl !== undefined).length}`);
        console.log(`   │    Pontos com fluxoPassantes_vl: ${pontosProcessados.filter(p => p.fluxoPassantes_vl !== null && p.fluxoPassantes_vl !== undefined).length}`);
      }
      console.log(`   ├─────────────────────────────────────────────────────────────┤`);
      if (fluxosEstimados.length > 0) {
        const min = Math.min(...fluxosEstimados);
        const max = Math.max(...fluxosEstimados);
        const media = fluxosEstimados.reduce((a, b) => a + b, 0) / fluxosEstimados.length;
        console.log(`   │ Fluxo Estimado (fluxoEstimado_vl)                          │`);
        console.log(`   │   Min: ${min.toLocaleString('pt-BR')}, Max: ${max.toLocaleString('pt-BR')}      │`);
        console.log(`   │   Média: ${media.toFixed(0).toLocaleString('pt-BR')}, Total: ${fluxosEstimados.length}/${pontosProcessados.length} pontos (${((fluxosEstimados.length/pontosProcessados.length)*100).toFixed(1)}%) │`);
      } else {
        console.log(`   │ ⚠️  Nenhum ponto com fluxo estimado (fluxoEstimado_vl)      │`);
      }
      console.log(`   ├─────────────────────────────────────────────────────────────┤`);
      if (fluxosCalculados.length > 0) {
        const min = Math.min(...fluxosCalculados);
        const max = Math.max(...fluxosCalculados);
        const media = fluxosCalculados.reduce((a, b) => a + b, 0) / fluxosCalculados.length;
        console.log(`   │ Fluxo Calculado (calculatedFluxoEstimado_vl)               │`);
        console.log(`   │   Min: ${min.toLocaleString('pt-BR')}, Max: ${max.toLocaleString('pt-BR')}      │`);
        console.log(`   │   Média: ${media.toFixed(0).toLocaleString('pt-BR')}, Total: ${fluxosCalculados.length}/${pontosProcessados.length} pontos (${((fluxosCalculados.length/pontosProcessados.length)*100).toFixed(1)}%) │`);
      } else {
        console.log(`   │ ⚠️  Nenhum ponto com fluxo calculado                      │`);
      }
      console.log(`   └─────────────────────────────────────────────────────────────┘`);
      
      // Comparação entre fluxoEstimado e calculatedFluxoEstimado
      if (fluxosEstimados.length > 0 && fluxosCalculados.length > 0) {
        const pontosComAmbos = pontosProcessados.filter(p => 
          (p.fluxoEstimado_vl !== null && p.fluxoEstimado_vl !== undefined && p.fluxoEstimado_vl > 0) &&
          (p.calculatedFluxoEstimado_vl !== null && p.calculatedFluxoEstimado_vl !== undefined && p.calculatedFluxoEstimado_vl > 0)
        );
        
        if (pontosComAmbos.length > 0) {
          const diferencas = pontosComAmbos.map(p => {
            const estimado = p.fluxoEstimado_vl;
            const calculado = p.calculatedFluxoEstimado_vl;
            const diff = estimado - calculado;
            const percentual = calculado > 0 ? (diff / calculado) * 100 : 0;
            return { estimado, calculado, diff, percentual };
          });
          
          const mediaDiff = diferencas.reduce((sum, d) => sum + d.diff, 0) / diferencas.length;
          const mediaPercentual = diferencas.reduce((sum, d) => sum + d.percentual, 0) / diferencas.length;
          
          console.log(`\n🔍 [COMPARAÇÃO] Fluxo Estimado vs Calculado (${pontosComAmbos.length} pontos com ambos):`);
          console.log(`   Diferença média: ${mediaDiff.toFixed(0).toLocaleString('pt-BR')} (${mediaPercentual > 0 ? '+' : ''}${mediaPercentual.toFixed(1)}%)`);
          console.log(`   Fluxo Estimado é ${mediaDiff > 0 ? 'MAIOR' : 'MENOR'} que Calculado em média`);
          
          // Verificar se são iguais (pode indicar que são o mesmo campo ou cálculo)
          const pontosIguais = diferencas.filter(d => Math.abs(d.percentual) < 1).length;
          if (pontosIguais > 0) {
            console.log(`   ⚠️  ${pontosIguais} pontos têm valores praticamente iguais (diferença < 1%)`);
          }
        }
      }
      
      // Comparar com hexágonos se disponível
      console.log(`\n🔍 [ANÁLISE] Comparação Hexágono vs Pontos:`);
      console.log(`   Hexágonos representam áreas geográficas (podem conter múltiplos pontos)`);
      console.log(`   Pontos representam unidades individuais de mídia`);
      console.log(`   O fluxo do hexágono deveria ser a agregação dos fluxos dos pontos dentro dele`);
      
      // RECOMENDAÇÃO BASEADA NA ANÁLISE
      console.log(`\n✅ [RECOMENDAÇÃO] Campo de fluxo a usar para pontos:`);
      if (fluxosReais.length > 0) {
        console.log(`   → Usar: fluxo_vl ou fluxoPassantes_vl (fluxo real - prioridade máxima)`);
      } else if (fluxosEstimados.length > 0 && fluxosCalculados.length > 0) {
        const mediaEstimado = fluxosEstimados.reduce((a, b) => a + b, 0) / fluxosEstimados.length;
        const mediaCalculado = fluxosCalculados.reduce((a, b) => a + b, 0) / fluxosCalculados.length;
        const percentualDiff = ((mediaEstimado / mediaCalculado) * 100 - 100).toFixed(1);
        
        console.log(`   → RECOMENDADO: fluxoEstimado_vl (mais completo, presente em 100% dos pontos)`);
        console.log(`   → Motivo: fluxoEstimado_vl é ${percentualDiff}% maior que calculatedFluxoEstimado_vl`);
        console.log(`   → fluxoEstimado_vl parece ser o valor original/estimado do ponto`);
        console.log(`   → calculatedFluxoEstimado_vl pode ser um valor processado/ajustado menor`);
        console.log(`   ⚠️  IMPORTANTE: Verificar qual campo o hexágono usa para comparação correta`);
      } else if (fluxosEstimados.length > 0) {
        console.log(`   → Usar: fluxoEstimado_vl (único campo disponível)`);
      } else if (fluxosCalculados.length > 0) {
        console.log(`   → Usar: calculatedFluxoEstimado_vl (fallback)`);
      }
      
      console.log(`\n📋 [RESUMO FINAL]`);
      console.log(`   Total de pontos: ${pontosProcessados.length}`);
      console.log(`   Pontos com fluxo real: ${fluxosReais.length}`);
      console.log(`   Pontos com fluxoEstimado_vl: ${fluxosEstimados.length} (${((fluxosEstimados.length/pontosProcessados.length)*100).toFixed(1)}%)`);
      console.log(`   Pontos com calculatedFluxoEstimado_vl: ${fluxosCalculados.length} (${((fluxosCalculados.length/pontosProcessados.length)*100).toFixed(1)}%)`);
      if (fluxosEstimados.length > 0 && fluxosCalculados.length > 0) {
        const mediaEstimado = fluxosEstimados.reduce((a, b) => a + b, 0) / fluxosEstimados.length;
        const mediaCalculado = fluxosCalculados.reduce((a, b) => a + b, 0) / fluxosCalculados.length;
        console.log(`   Média fluxoEstimado_vl: ${mediaEstimado.toFixed(0).toLocaleString('pt-BR')}`);
        console.log(`   Média calculatedFluxoEstimado_vl: ${mediaCalculado.toFixed(0).toLocaleString('pt-BR')}`);
      }
    }
    
    res.status(200).json({ 
      pontos: pontosProcessados
    });
    
  } catch (err) {
    console.error('Erro na API /api/pontos-midia:', err);
    res.status(500).json({ 
      error: 'Erro interno do servidor', 
      details: err.message, 
      stack: err.stack 
    });
  }
};
