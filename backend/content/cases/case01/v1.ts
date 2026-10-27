import type { CaseContentDefinitionV1 } from '../../case-content-definition.js'
import { parseCaseContentDefinition } from '../../case-content-definition.js'

const case01ContentV1: CaseContentDefinitionV1 = {
  schemaVersion: 1,
  caseId: 'case01',
  contentVersion: '1.0.0',
  resolvedKeys: [
    'gallery-lock',
    'gallery-pedestal',
    'gallery-service-door',
    'security-initial-report',
    'security-log-gap',
    'marta-tools',
    'marta-tools-refuted',
    'helena-insurance',
    'helena-insurance-refuted',
    'corridor-camera-report',
    'corridor-oil-confirmed',
    'e1-confirmed',
    'e2-confirmed',
    'e3-confirmed',
    'e4-confirmed',
    'e5-confirmed',
    'e6-confirmed',
  ],
  evidence: [
    {
      key: 'gallery-lock',
      title: 'Fechadura de emergência da vitrine',
      content: 'A fechadura interna não apresenta dano; o mecanismo foi operado por dentro.',
      status: 'unconfirmed',
      locationId: 'gallery',
      confirmedEvidenceKey: 'e1-confirmed',
    },
    {
      key: 'gallery-pedestal',
      title: 'Vestígio no pedestal',
      content: 'Óleo escuro e pó fino seguem em direção à porta de serviço.',
      status: 'indicio',
      locationId: 'gallery',
    },
    {
      key: 'gallery-service-door',
      title: 'Porta de serviço',
      content: 'Uma chapa solta revela poeira deslocada e uma marca de carrinho junto à passagem.',
      status: 'unconfirmed',
      locationId: 'gallery',
      unlocksLocationId: 'service-corridor',
    },
    {
      key: 'e1-confirmed',
      title: 'Chave de emergência confirmada',
      content:
        'A inspeção confirma que a vitrine foi aberta pelo mecanismo interno, sem arrombamento.',
      status: 'confirmed',
      locationId: 'gallery',
      confirmedEvidenceKey: 'e1-confirmed',
    },
    {
      key: 'security-initial-report',
      title: 'Relatório inicial do apagão',
      content: 'Os registros situam a interrupção entre 22h14 e 22h21.',
      status: 'unconfirmed',
      locationId: 'security',
    },
    {
      key: 'security-log-gap',
      title: 'Lacuna no terminal',
      content: 'Um bloco de registros desapareceu do terminal pouco antes do apagão.',
      status: 'unconfirmed',
      locationId: 'security',
    },
    {
      key: 'e2-confirmed',
      title: 'Acionamento manual confirmado',
      content:
        'A cronologia técnica confirma que o comando de interrupção foi acionado dentro do prédio às 22h14.',
      status: 'confirmed',
      locationId: 'security',
      confirmedEvidenceKey: 'e2-confirmed',
    },
    {
      key: 'e3-confirmed',
      title: 'Exclusão de registros confirmada',
      content: 'A lacuna foi criada no terminal da sala de segurança às 22h13.',
      status: 'confirmed',
      locationId: 'security',
      confirmedEvidenceKey: 'e3-confirmed',
    },
    {
      key: 'e6-confirmed',
      title: 'Retorno do cartão de acesso',
      content:
        'O cartão de Raul registrou retorno à sala às 22h16, sem passagem correspondente pelo acesso público.',
      status: 'confirmed',
      locationId: 'security',
      confirmedEvidenceKey: 'e6-confirmed',
    },
    {
      key: 'marta-tools',
      title: 'Marcas nas ferramentas',
      content: 'As ferramentas de restauração podem explicar marcas encontradas perto da vitrine.',
      status: 'unconfirmed',
      locationId: 'laboratory',
      isFalseLead: true,
    },
    {
      key: 'marta-tools-refuted',
      title: 'Marcas de restauração refutadas',
      content: 'O registro técnico data as marcas da semana anterior à ocorrência.',
      status: 'refuted',
      locationId: 'laboratory',
      isFalseLead: true,
    },
    {
      key: 'helena-insurance',
      title: 'Avaliação do seguro',
      content:
        'A avaliação recente poderia parecer ligada ao desaparecimento e exige verificação documental.',
      status: 'unconfirmed',
      locationId: 'office',
      isFalseLead: true,
    },
    {
      key: 'helena-insurance-refuted',
      title: 'Avaliação do seguro refutada',
      content: 'O documento confirma que a avaliação foi solicitada antes da exposição.',
      status: 'refuted',
      locationId: 'office',
      isFalseLead: true,
    },
    {
      key: 'e4-confirmed',
      title: 'Rota pelo corredor confirmada',
      content:
        'Óleo recente acompanha as marcas do carrinho até a área técnica, sem sinal de passagem pelo acesso público.',
      status: 'confirmed',
      locationId: 'service-corridor',
      confirmedEvidenceKey: 'e4-confirmed',
    },
    {
      key: 'corridor-camera-report',
      title: 'Relatório da câmera',
      content: 'Um relatório antigo registra a câmera do corredor inoperante e a correção adiada.',
      status: 'unconfirmed',
      locationId: 'service-corridor',
    },
    {
      key: 'corridor-oil-confirmed',
      title: 'Resíduo do corredor analisado',
      content: 'O óleo corresponde ao lubrificante dos carrinhos da equipe técnica.',
      status: 'confirmed',
      locationId: 'service-corridor',
    },
    {
      key: 'e5-confirmed',
      title: 'Falha de câmera confirmada',
      content: 'O relatório técnico confirma que a falha foi conhecida e não formalizada.',
      status: 'confirmed',
      locationId: 'service-corridor',
      confirmedEvidenceKey: 'e5-confirmed',
    },
  ],
  actionRules: [
    { id: 'gallery-lock', action: 'examine', locationId: 'gallery', evidenceKey: 'gallery-lock' },
    {
      id: 'gallery-pedestal',
      action: 'examine',
      locationId: 'gallery',
      requiresResolvedKeys: ['gallery-lock'],
      evidenceKey: 'gallery-pedestal',
    },
    {
      id: 'gallery-service-door',
      action: 'examine',
      locationId: 'gallery',
      minimumRound: 3,
      requiresResolvedKeys: ['gallery-lock', 'gallery-pedestal'],
      evidenceKey: 'gallery-service-door',
    },
    {
      id: 'gallery-lock-confirmation',
      action: 'analyse',
      locationId: 'gallery',
      requiresResolvedKeys: ['gallery-lock'],
      evidenceKey: 'e1-confirmed',
    },
    {
      id: 'security-initial-report',
      action: 'research',
      locationId: 'security',
      evidenceKey: 'security-initial-report',
    },
    {
      id: 'security-log-gap',
      action: 'research',
      locationId: 'security',
      minimumRound: 2,
      requiresResolvedKeys: ['security-initial-report'],
      evidenceKey: 'security-log-gap',
    },
    {
      id: 'security-return-card',
      action: 'research',
      locationId: 'security',
      minimumRound: 4,
      requiresResolvedKeys: ['security-initial-report', 'security-log-gap'],
      evidenceKey: 'e6-confirmed',
    },
    {
      id: 'security-manual-command',
      action: 'analyse',
      locationId: 'security',
      minimumRound: 3,
      evidenceKey: 'e2-confirmed',
    },
    {
      id: 'security-log-deletion',
      action: 'analyse',
      locationId: 'security',
      minimumRound: 3,
      requiresResolvedKeys: ['security-log-gap'],
      evidenceKey: 'e3-confirmed',
    },
    {
      id: 'laboratory-tools',
      action: 'examine',
      locationId: 'laboratory',
      evidenceKey: 'marta-tools',
    },
    {
      id: 'laboratory-tools-analysis',
      action: 'analyse',
      locationId: 'laboratory',
      evidenceKey: 'marta-tools',
    },
    {
      id: 'laboratory-tools-refuted-by-card',
      action: 'analyse',
      locationId: 'laboratory',
      requiresResolvedKeys: ['marta-tools'],
      preparedCardId: 'treatment-sheet',
      evidenceKey: 'marta-tools-refuted',
    },
    {
      id: 'laboratory-tools-refuted-by-lock',
      action: 'analyse',
      locationId: 'laboratory',
      requiresResolvedKeys: ['marta-tools', 'gallery-lock'],
      evidenceKey: 'marta-tools-refuted',
    },
    {
      id: 'insurance-review',
      action: 'research',
      locationId: 'office',
      evidenceKey: 'helena-insurance',
    },
    {
      id: 'insurance-review-refuted-by-card',
      action: 'research',
      locationId: 'office',
      requiresResolvedKeys: ['helena-insurance'],
      preparedCardId: 'curator-agenda',
      evidenceKey: 'helena-insurance-refuted',
    },
    {
      id: 'insurance-review-refuted-by-round',
      action: 'research',
      locationId: 'office',
      minimumRound: 2,
      requiresResolvedKeys: ['helena-insurance'],
      evidenceKey: 'helena-insurance-refuted',
    },
    {
      id: 'service-route',
      action: 'examine',
      locationId: 'service-corridor',
      minimumRound: 3,
      requiresResolvedKeys: ['gallery-service-door'],
      evidenceKey: 'e4-confirmed',
    },
    {
      id: 'service-camera-report',
      action: 'research',
      locationId: 'service-corridor',
      minimumRound: 4,
      requiresResolvedKeys: ['gallery-service-door'],
      evidenceKey: 'corridor-camera-report',
    },
    {
      id: 'service-oil-analysis',
      action: 'analyse',
      locationId: 'service-corridor',
      minimumRound: 5,
      requiresResolvedKeys: ['gallery-service-door', 'e4-confirmed'],
      evidenceKey: 'corridor-oil-confirmed',
    },
    {
      id: 'service-camera-analysis',
      action: 'analyse',
      locationId: 'service-corridor',
      requiresResolvedKeys: ['gallery-service-door', 'corridor-camera-report'],
      evidenceKey: 'e5-confirmed',
    },
  ],
  hypotheses: [
    {
      id: 'case01-primary-operation',
      evidence: [
        { evidenceKey: 'e1-confirmed', axes: ['means'] },
        { evidenceKey: 'e2-confirmed', axes: ['opportunity'] },
        { evidenceKey: 'e3-confirmed', axes: ['link'] },
        { evidenceKey: 'e4-confirmed', axes: ['link'] },
        { evidenceKey: 'e5-confirmed', axes: ['means', 'link'] },
        { evidenceKey: 'e6-confirmed', axes: ['opportunity', 'link'] },
      ],
      requiredAxes: ['means', 'opportunity', 'link'],
      minimumCoherentRelations: 2,
    },
  ],
  operations: [
    {
      id: 'verify-the-theory',
      kind: 'verify',
      title: 'Verificar a linha de raciocínio',
      riskDescription:
        'A equipe confronta a linha com os registros reunidos; uma inconsistência ainda pode exigir revisão.',
      availableWhenStatuses: ['plausible', 'sustained'],
      outcomes: [
        {
          hypothesisId: 'case01-primary-operation',
          whenHypothesisStatus: 'plausible',
          isResolved: true,
          observation:
            'A equipe confrontou a linha com os registros reunidos. A relação permanece plausível e pode ser fortalecida antes do encerramento.',
        },
        {
          hypothesisId: 'case01-primary-operation',
          whenHypothesisStatus: 'sustained',
          isResolved: true,
          observation:
            'A equipe confrontou a linha com os registros reunidos. A consistência observada permite considerar a preservação formal das evidências.',
        },
      ],
    },
    {
      id: 'preserve-the-evidence',
      kind: 'closure',
      title: 'Preservar a prova',
      riskDescription:
        'A equipe formaliza a linha sustentada e protege os elementos que dão suporte à conclusão.',
      availableWhenStatuses: ['sustained'],
      outcomes: [
        {
          hypothesisId: 'case01-primary-operation',
          whenHypothesisStatus: 'sustained',
          isResolved: true,
          observation:
            'A formalização encontrou uma inconsistência entre os registros. Reavalie as relações já anotadas antes de tentar outra abordagem.',
        },
        {
          hypothesisId: 'case01-primary-operation',
          whenHypothesisStatus: 'plausible',
          isResolved: false,
          observation:
            'A formalização encontrou uma inconsistência entre os registros. Reavalie as relações já anotadas antes de tentar outra abordagem.',
        },
      ],
    },
  ],
  conversations: [
    {
      personId: 'helena',
      personName: 'Helena Duarte',
      locationId: 'office',
      questions: [
        {
          id: 'institutional-access',
          text: 'Quem podia consultar o acervo esta noite?',
          cost: 2,
          approach: 'pressure',
          result:
            'Helena diz que o acervo exige autorização formal e que os acessos de serviço ficam sob outro setor.',
          blockedWhen: {
            requiresResolvedKeys: ['gallery-lock'],
            reason: 'Examine a fechadura de emergência na Galeria Principal.',
          },
          outcomes: [
            {
              whenResolvedKeys: ['gallery-lock'],
              status: 'recorded',
              content:
                'Helena confirma que a chave de emergência não era parte da rotina da curadoria e aponta os protocolos de acesso de serviço.',
            },
            {
              status: 'blocked',
              content:
                'Helena pede uma evidência concreta antes de detalhar os acessos internos e indica que a vitrine precisa ser examinada primeiro.',
            },
          ],
        },
        {
          id: 'insurance-review',
          text: 'Por que a avaliação do seguro estava em andamento?',
          cost: 2,
          approach: 'inquiry',
          result:
            'Helena afirma que a avaliação foi solicitada para a exposição e pede que o documento seja lido antes de qualquer conclusão.',
          reward: 'curator-agenda',
        },
        {
          id: 'marta-disagreement',
          text: 'O que houve entre você e Marta?',
          cost: 1,
          approach: 'context',
          result:
            'Helena descreve uma divergência sobre conservação e recomenda verificar o trabalho interrompido no laboratório.',
        },
      ],
    },
    {
      personId: 'raul',
      personName: 'Raul Viana',
      locationId: 'security',
      questions: [
        {
          id: 'security-procedure',
          text: 'Como a equipe respondeu ao apagão?',
          cost: 2,
          approach: 'context',
          result:
            'Raul relata que seguiu o protocolo de segurança e direciona a investigação para os registros da sala.',
          blockedWhen: {
            requiresResolvedKeys: ['security-log-gap'],
            reason: 'Encontre um registro independente da sala de segurança.',
          },
          reward: 'patrol-map',
        },
        {
          id: 'power-failure',
          text: 'O que você sabe sobre a falha de energia?',
          cost: 2,
          approach: 'pressure',
          result:
            'Raul chama a falha de inesperada e sugere conferir a cronologia técnica antes de responsabilizar alguém.',
          blockedWhen: {
            requiresResolvedKeys: ['security-initial-report'],
            reason: 'Encontre um registro técnico que sustente a falha de energia.',
          },
          outcomes: [
            {
              whenResolvedKeys: ['security-initial-report'],
              status: 'contestable',
              content:
                'Raul mantém que a falha foi inesperada, apesar de agora existir motivo para confrontar a versão com a cronologia técnica.',
            },
            {
              status: 'blocked',
              content:
                'Raul chama a falha de inesperada e evita avançar sem um relatório técnico que sustente a pressão.',
            },
          ],
        },
        {
          id: 'museum-routine',
          text: 'Quem circulava pelas áreas internas?',
          cost: 1,
          approach: 'inquiry',
          result:
            'Raul enumera a rotina de vigilância, mas evita detalhar os deslocamentos durante os sete minutos sem imagem.',
        },
      ],
    },
    {
      personId: 'marta',
      personName: 'Marta Lobo',
      locationId: 'laboratory',
      questions: [
        {
          id: 'technical-assessment',
          text: 'Como estava a vitrine na sua última avaliação?',
          cost: 2,
          approach: 'inquiry',
          result:
            'Marta explica que registrou o estado da vitrine antes da abertura e pede que a análise respeite o histórico de conservação.',
          reward: 'treatment-sheet',
        },
        {
          id: 'fingerprints',
          text: 'Por que suas digitais estão próximas à vitrine?',
          cost: 2,
          approach: 'pressure',
          result:
            'Marta confirma o manuseio técnico autorizado e indica que suas ferramentas podem esclarecer a origem de certas marcas.',
          blockedWhen: {
            requiresResolvedKeys: ['gallery-lock'],
            reason: 'Examine a fechadura de emergência na Galeria Principal.',
          },
          outcomes: [
            {
              whenResolvedKeys: ['gallery-lock'],
              status: 'recorded',
              content:
                'Diante da abertura interna confirmada, Marta explica que suas digitais vêm do manuseio técnico autorizado e oferece as ferramentas para comparação.',
            },
            {
              status: 'blocked',
              content:
                'Marta reconhece o manuseio técnico, mas pede que a vitrine seja examinada antes de aceitar uma acusação baseada apenas em digitais.',
            },
          ],
        },
        {
          id: 'davi-interest',
          text: 'Davi procurou você por causa do Astrolábio?',
          cost: 1,
          approach: 'context',
          result:
            'Marta conta que Davi fez perguntas sobre a peça, mas ela recusou compartilhar informações técnicas fora do procedimento.',
        },
      ],
    },
    {
      personId: 'davi',
      personName: 'Davi Orsini',
      locationId: 'gallery',
      questions: [
        {
          id: 'collectors',
          text: 'Que interesse seus contatos têm na exposição?',
          cost: 2,
          approach: 'inquiry',
          result:
            'Davi diz que colecionadores acompanham a mostra, mas insiste que interesse em patrimônio não equivale a acesso ao museu.',
          blockedWhen: {
            requiresResolvedKeys: ['security-log-gap'],
            reason: 'Encontre um registro independente da sala de segurança.',
          },
          reward: 'guest-list',
        },
        {
          id: 'message',
          text: 'Sobre o que tratava a mensagem recebida hoje?',
          cost: 2,
          approach: 'pressure',
          result:
            'Davi afirma que a mensagem tratava de outra negociação e se dispõe a localizar os documentos correspondentes.',
          blockedWhen: {
            requiresResolvedKeys: ['e2-confirmed'],
            reason: 'Encontre uma evidência que relacione a mensagem ao desaparecimento.',
          },
          outcomes: [
            {
              whenResolvedKeys: ['e2-confirmed'],
              status: 'contestable',
              content:
                'Davi afirma que a mensagem trata de outra negociação e aceita localizar documentos para que a versão possa ser verificada.',
            },
            {
              status: 'blocked',
              content:
                'Davi não aceita discutir mensagens privadas antes que a equipe tenha uma razão concreta para vinculá-las ao desaparecimento.',
            },
          ],
        },
        {
          id: 'helena-sponsorship',
          text: 'Como está sua relação com Helena?',
          cost: 1,
          approach: 'context',
          result:
            'Davi reconhece tensão sobre o patrocínio, mas separa a discussão financeira da rotina de segurança da exposição.',
        },
      ],
    },
  ],
}

export const case01Content = parseCaseContentDefinition(case01ContentV1)
