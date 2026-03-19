-- Adicionar flag de liberação para agência na tabela de grupos de plano de mídia
-- Quando liberadoAgencia_bl = 1, o roteiro fica visível para o usuário da agência vinculada
ALTER TABLE serv_product_be180.planoMidiaGrupo_dm
ADD liberadoAgencia_bl BIT NOT NULL CONSTRAINT DF_planoMidiaGrupo_liberadoAgencia DEFAULT 0;
