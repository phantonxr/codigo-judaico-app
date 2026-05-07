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
          Última atualização: maio de 2025
        </p>

        <div style={{ display: 'grid', gap: 40 }}>

          <Section title="1. Quem somos">
            <p>
              O <strong style={{ color: 'rgba(255,255,255,0.9)' }}>Código Judaico da Prosperidade</strong> é
              uma plataforma SaaS de educação financeira inspirada nos princípios judaicos de prosperidade,
              operada por Wallace Torres, com sede no Brasil (CNPJ em processo de regularização).
            </p>
          </Section>

          <Section title="2. Dados que coletamos">
            <p style={{ marginBottom: 12 }}>Coletamos somente os dados necessários para prestar o serviço:</p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Nome e e-mail:</strong> fornecidos por você no cadastro e checkout.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Senha:</strong> armazenada com hash seguro (bcrypt). Nunca armazenamos sua senha em texto claro.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dados de pagamento:</strong> processados integralmente pelo Stripe. Não temos acesso ao número do cartão ou dados bancários.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Progresso e reflexões:</strong> tarefas concluídas, reflexões diárias e registros de gatilhos financeiros dentro da plataforma.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Dados de uso:</strong> sessões, acessos e interações com o Rabino Mentor IA, para personalização do serviço.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Cookies:</strong> cookies de sessão para autenticação e cookies de preferência (ex.: idioma).</li>
            </ul>
          </Section>

          <Section title="3. Como usamos seus dados">
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li>Criar e gerenciar sua conta de acesso à plataforma.</li>
              <li>Processar pagamentos via Stripe e liberar o acesso ao conteúdo.</li>
              <li>Enviar e-mails transacionais (confirmação de acesso, recuperação de senha) via Resend.</li>
              <li>Personalizar sua jornada e as respostas do Rabino Mentor IA (via OpenAI, com seus dados de reflexão).</li>
              <li>Melhorar a plataforma com base em padrões agregados de uso.</li>
            </ul>
          </Section>

          <Section title="4. Compartilhamento de dados">
            <p style={{ marginBottom: 12 }}>
              Seus dados são compartilhados apenas com parceiros estritamente necessários para a operação:
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
                geração de feedback do Rabino Mentor IA a partir das suas reflexões. As reflexões são
                enviadas de forma desassociada de identificadores diretos.
              </li>
            </ul>
            <p style={{ marginTop: 14 }}>
              Não vendemos, alugamos nem compartilhamos seus dados com terceiros para fins publicitários.
            </p>
          </Section>

          <Section title="5. Transferência internacional de dados">
            <p>
              Stripe, Resend e OpenAI estão sediados nos EUA. A transferência de dados ocorre com base
              em cláusulas contratuais padrão e em conformidade com a LGPD (art. 33, I e II).
            </p>
          </Section>

          <Section title="6. Retenção de dados">
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa. Após o cancelamento ou solicitação
              de exclusão, os dados pessoais são removidos em até 30 dias, salvo obrigação legal de
              retenção (ex.: dados fiscais, conforme legislação brasileira).
            </p>
          </Section>

          <Section title="7. Seus direitos (LGPD — Lei 13.709/2018)">
            <p style={{ marginBottom: 12 }}>Nos termos da Lei Geral de Proteção de Dados, você tem direito a:</p>
            <ul style={{ margin: 0, paddingLeft: 22, display: 'grid', gap: 8 }}>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Confirmação e acesso:</strong> saber se tratamos seus dados e quais são eles.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Correção:</strong> corrigir dados incompletos, inexatos ou desatualizados.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Anonimização, bloqueio ou eliminação:</strong> solicitar a exclusão dos seus dados pessoais.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Portabilidade:</strong> receber seus dados em formato estruturado.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Revogação de consentimento:</strong> retirar o consentimento a qualquer momento, sem prejuízo ao serviço já prestado.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Oposição:</strong> opor-se ao tratamento realizado sem seu consentimento.</li>
              <li><strong style={{ color: 'rgba(255,255,255,0.85)' }}>Reclamação à ANPD:</strong> registrar reclamação perante a Autoridade Nacional de Proteção de Dados.</li>
            </ul>
            <p style={{ marginTop: 14 }}>
              Para exercer qualquer um desses direitos, entre em contato pelo e-mail indicado na seção 10.
            </p>
          </Section>

          <Section title="8. Cookies">
            <p style={{ marginBottom: 12 }}>Utilizamos os seguintes tipos de cookies:</p>
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
            </ul>
            <p style={{ marginTop: 14 }}>
              Não utilizamos cookies de rastreamento publicitário ou analytics de terceiros.
              Você pode gerenciar cookies nas configurações do seu navegador.
            </p>
          </Section>

          <Section title="9. Segurança">
            <p>
              Adotamos medidas técnicas de segurança adequadas: HTTPS em todas as comunicações,
              senhas armazenadas com bcrypt, tokens de sessão aleatórios e controles de acesso por função.
              Em caso de incidente de segurança que afete seus dados, notificaremos a ANPD e os titulares
              afetados no prazo legal.
            </p>
          </Section>

          <Section title="10. Encarregado de Dados (DPO)">
            <p style={{ marginBottom: 16 }}>
              Em conformidade com o art. 41 da LGPD, o encarregado pelo tratamento dos dados pessoais
              desta plataforma é:
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

          <Section title="11. Alterações nesta política">
            <p>
              Esta política pode ser atualizada periodicamente. Notificaremos sobre mudanças relevantes
              por e-mail ou aviso na plataforma. O uso continuado do serviço após as alterações implica
              aceitação da nova política.
            </p>
          </Section>

          <Section title="12. Contato">
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
