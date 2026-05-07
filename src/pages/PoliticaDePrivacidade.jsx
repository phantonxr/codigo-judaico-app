import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

var GOLD = 'rgba(215, 178, 74, 0.9)'
var GOLD_TEXT = 'rgba(240, 210, 122, 0.95)'
var MUTED = 'rgba(255, 255, 255, 0.65)'

function Section({ title, children }) {
  return (
    <section style={{ display: 'grid', gap: 12 }}>
      <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0, color: GOLD_TEXT }}>{title}</h2>
      <div style={{ color: MUTED, lineHeight: 1.85 }}>{children}</div>
    </section>
  )
}

export default function PoliticaDePrivacidade() {
  const { t } = useTranslation()

  return (
    <div style={{ minHeight: '100vh', padding: '48px 0 100px' }}>
      <div className="container" style={{ maxWidth: 820 }}>

        <div style={{ marginBottom: 32 }}>
          <Link to="/" className="btn" style={{ fontSize: 14 }}>
            ← {t('common.back')}
          </Link>
        </div>

        <h1 style={{ fontSize: 30, margin: '0 0 6px', color: GOLD_TEXT }}>
          Política de Privacidade
        </h1>
        <p style={{ margin: '0 0 48px', fontSize: 13, color: MUTED }}>
          Última atualização: 7 de maio de 2026
        </p>

        <div style={{ display: 'grid', gap: 40 }}>

          <Section title="1. Quem somos">
            <p>
              O <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Código Judaico da Prosperidade</strong> é
              uma plataforma SaaS de educação financeira e desenvolvimento pessoal. A operação técnica,
              comercial e de conteúdo é feita pelos responsáveis informados nos Termos de Serviço exibidos
              no checkout e dentro da plataforma. Enquanto houver divergência entre esta página e os documentos
              legais versionados, prevalece o documento versionado mais recente aceito pelo usuário.
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p style={{ marginBottom: 12 }}>Coletamos somente os dados necessários para prestar o serviço:</p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Nome e e-mail:</strong> fornecidos por você no cadastro e checkout.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Senha:</strong> armazenada com hash seguro (bcrypt). Nunca armazenamos sua senha em texto claro.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dados de pagamento:</strong> processados integralmente pelo Stripe. Não temos acesso ao número do cartão ou dados bancários.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Progresso e reflexões:</strong> tarefas concluídas, reflexões diárias e registros de gatilhos financeiros dentro da plataforma.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dados de uso:</strong> sessões, acessos, plano, status de assinatura, histórico de login e interações com o Rabino Mentor IA.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Armazenamento local:</strong> token de sessão, preferências, progresso local e escolhas de consentimento no navegador.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Atribuição de campanha:</strong> UTMs como origem, mídia e campanha, somente quando você autoriza marketing e atribuição.</li>
            </ul>
          </Section>

          <Section title="3. Como usamos seus dados">
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li>Criar e gerenciar sua conta de acesso à plataforma.</li>
              <li>Processar pagamentos via Stripe e liberar o acesso ao conteúdo.</li>
              <li>Enviar e-mails transacionais (confirmação de acesso, recuperação de senha) via Resend.</li>
              <li>Personalizar sua jornada e as respostas do Rabino Mentor IA (via OpenAI, com seus dados de reflexão).</li>
              <li>Medir campanhas e conversões quando você permite marketing e atribuição.</li>
              <li>Proteger a plataforma, prevenir fraude, cumprir obrigações legais e atender solicitações de titulares.</li>
            </ul>
            <p style={{ marginTop: 14 }}>
              As bases legais podem incluir execução de contrato, cumprimento de obrigação legal, legítimo
              interesse, consentimento e exercício regular de direitos, conforme a finalidade e a jurisdição aplicável.
            </p>
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p style={{ marginBottom: 12 }}>
              Seus dados podem ser compartilhados com provedores necessários para operar, proteger e medir a plataforma:
            </p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li>
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Stripe (EUA):</strong>{' '}
                processamento de pagamentos.{' '}
                <a href="https://stripe.com/br/privacy" target="_blank" rel="noopener noreferrer" style={{ color: GOLD }}>
                  Política do Stripe
                </a>.
              </li>
              <li>
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Resend (EUA):</strong>{' '}
                envio de e-mails transacionais.
              </li>
	              <li>
	                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>OpenAI (EUA):</strong>{' '}
	                geração de feedback do Rabino Mentor IA a partir das suas reflexões e mensagens. Evite
	                inserir dados sensíveis que não sejam necessários para usar a funcionalidade.
	              </li>
	              <li>
	                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>UTMfy (Brasil):</strong>{' '}
	                atribuição de campanhas e eventos de checkout quando você autoriza marketing e atribuição.
	              </li>
	              <li>
	                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Hospedagem, banco de dados e mídia:</strong>{' '}
	                infraestrutura usada para disponibilizar a aplicação, armazenar registros da conta e servir conteúdos.
	              </li>
            </ul>
            <p style={{ marginTop: 14 }}>
              Não vendemos seus dados pessoais como produto independente. Quando a lei tratar atribuição,
              publicidade comportamental ou compartilhamento para marketing como "venda" ou "compartilhamento",
              você pode recusar ou revogar essa finalidade no botão de privacidade exibido no site.
            </p>
          </Section>

          <Section title="5. Transferência internacional de dados">
            <p>
              Alguns provedores podem processar dados fora do Brasil, inclusive nos EUA, Canadá ou União Europeia.
              Usamos contratos, controles de acesso e salvaguardas disponíveis para reduzir riscos de transferência
              internacional, incluindo cláusulas contratuais e medidas técnicas proporcionais ao serviço.
            </p>
          </Section>

          <Section title="6. Retenção de dados">
            <p>
              Mantemos dados da conta enquanto ela estiver ativa e pelo tempo necessário para cumprir contrato,
              obrigações fiscais, prevenção de fraude, segurança, suporte, backup e defesa de direitos. Quando
              você solicita exclusão, removemos ou anonimizamos dados operacionais sempre que possível e podemos
              manter registros mínimos exigidos por lei ou necessários para comprovar transações e consentimentos.
            </p>
          </Section>

          <Section title="7. Seus direitos">
            <p style={{ marginBottom: 12 }}>
              Conforme a lei aplicável ao seu caso, incluindo LGPD, GDPR, PIPEDA/Canadá, leis provinciais
              canadenses e leis estaduais dos EUA como CCPA/CPRA, você pode ter direito a:
            </p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Confirmação e acesso:</strong> saber se tratamos seus dados e quais são eles.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Anonimização, bloqueio ou eliminação:</strong> solicitar a exclusão dos seus dados pessoais.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Revogação de consentimento:</strong> retirar o consentimento a qualquer momento, sem prejuízo ao serviço já prestado.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Oposição e limitação:</strong> opor-se a certos tratamentos, limitar uso de dados sensíveis quando aplicável e recusar venda/compartilhamento para marketing.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Reclamação:</strong> reclamar perante a ANPD, autoridade europeia de proteção de dados, autoridade canadense/provincial ou órgão estadual aplicável.</li>
            </ul>
            <p style={{ marginTop: 14 }}>
              Usuários autenticados podem usar os controles de privacidade da plataforma quando disponíveis.
              Você também pode solicitar atendimento pelo e-mail indicado na seção 10.
            </p>
          </Section>

          <Section title="8. Cookies e armazenamento local">
            <p style={{ marginBottom: 12 }}>Usamos cookies e armazenamento local nas seguintes categorias:</p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li>
                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Essenciais:</strong>{' '}
                necessários para autenticação e funcionamento da plataforma. Não podem ser desativados
                sem comprometer o acesso ao serviço.
              </li>
	              <li>
	                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Preferência:</strong>{' '}
	                armazenam configurações como idioma escolhido.
	              </li>
	              <li>
	                <strong style={{ color: 'rgba(255,255,255,0.85)' }}>Marketing e atribuição:</strong>{' '}
	                armazenam UTMs e permitem mensuração de campanhas somente com sua autorização.
	              </li>
            </ul>
            <p style={{ marginTop: 14 }}>
              Você pode aceitar, recusar ou alterar preferências pelo botão "Privacidade" exibido no site.
              Também pode limpar dados nas configurações do navegador.
            </p>
          </Section>

          <Section title="9. Segurança">
            <p>
              Adotamos medidas técnicas de segurança proporcionais, incluindo HTTPS, senhas armazenadas com
              bcrypt, tokens de sessão aleatórios, controles de acesso por função, cabeçalhos de segurança e
              restrição de permissões no navegador. Nenhum serviço online é totalmente imune a riscos. Em caso
              de incidente relevante, avaliaremos impacto, registraremos o evento e notificaremos titulares e
              autoridades quando exigido por lei.
            </p>
          </Section>

          <Section title="10. Encarregado de Dados (DPO)">
            <p style={{ marginBottom: 16 }}>
              O canal de privacidade e atendimento a solicitações de titulares desta plataforma é:
            </p>
            <div
              className="card"
              style={{ boxShadow: 'none', borderColor: 'rgba(215, 178, 74, 0.3)' }}
            >
              <div className="card-inner" style={{ display: 'grid', gap: 8 }}>
                <div>
                  <span style={{ color: MUTED, fontSize: 13 }}>Nome</span>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontWeight: 600, marginTop: 2 }}>
                    Wallace Torres
                  </div>
                </div>
                <div>
                  <span style={{ color: MUTED, fontSize: 13 }}>E-mail</span>
                  <div style={{ marginTop: 2 }}>
                    <a
                      href="mailto:privacidade@codigomilenarjudaico.com"
                      style={{ color: GOLD, fontWeight: 600 }}
                    >
                      privacidade@codigomilenarjudaico.com
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </Section>

          <Section title="11. Crianças e adolescentes">
            <p>
              A plataforma não é direcionada a menores de 13 anos. Se identificarmos coleta de dados de menor
              sem consentimento exigido por lei, poderemos bloquear o uso e excluir os dados aplicáveis. Usuários
              menores de idade devem usar a plataforma apenas com autorização de responsável legal quando exigido.
            </p>
          </Section>

          <Section title="12. Alterações nesta política">
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças relevantes
              por e-mail, aviso na plataforma ou novo aceite dos documentos legais versionados quando necessário.
            </p>
          </Section>

          <Section title="13. Contato">
            <p style={{ marginBottom: 10 }}>
              Para dúvidas, solicitações ou exercício dos seus direitos como titular de dados:
            </p>
            <a
              href="mailto:privacidade@codigomilenarjudaico.com"
              style={{ color: GOLD, fontWeight: 600, fontSize: 16 }}
            >
              privacidade@codigomilenarjudaico.com
            </a>
          </Section>

        </div>

        <div style={{ marginTop: 60, paddingTop: 32, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <Link to="/" className="btn" style={{ fontSize: 14 }}>
            ← {t('common.back')}
          </Link>
        </div>

      </div>
    </div>
  )
}
