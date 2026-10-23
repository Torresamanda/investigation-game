<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { locations, suspectProfiles, type LocationId, type SuspectId } from '../../content/case01'
import { useInvestigationStore } from '../../stores/investigation'
import type { InvestigationAction } from '../../domain/game/action-points'
import { useJournalDisclosure } from './composables/useJournalDisclosure'
import CaseToolbar from './components/CaseToolbar.vue'
import LocationsPanel from './components/LocationsPanel.vue'
import InvestigationScene from './components/InvestigationScene.vue'
import CardHand from './components/CardHand.vue'
import InvestigationActions from './components/InvestigationActions.vue'
import SuspectSection from './components/SuspectSection.vue'
import CaseJournal from './components/CaseJournal.vue'
import CaseIntroduction from './components/CaseIntroduction.vue'
import ConversationDialog from './components/ConversationDialog.vue'
import AccusationDialog from './components/AccusationDialog.vue'
import type { AccusationSubmission, ConversationOptions } from '../../services/game-api'
import { feedbackFromEntry, statusFeedback } from './action-feedback'
import './investigation.css'

const session = useInvestigationStore()
const isSupportRequestPending = ref(false)
const feedback = ref(statusFeedback('Escolha como deseja conduzir a investigação.'))
const cards = computed(() => session.hand)
const locationId = ref<LocationId>('gallery')
function findSuspectIdAtLocation(targetLocationId: LocationId): SuspectId | null {
  return suspectProfiles.find((person) => person.locationId === targetLocationId)?.id ?? null
}

const selectedSuspectId = ref<SuspectId | null>(findSuspectIdAtLocation(locationId.value))
watch(locationId, (targetLocationId) => {
  selectedSuspectId.value = findSuspectIdAtLocation(targetLocationId)
})
watch(
  () => session.currentLocationId,
  (currentLocationId) => {
    locationId.value = currentLocationId
  },
)
const location = computed(
  () => locations.find((item) => item.id === locationId.value) ?? locations[0],
)
const selectedSuspect = computed(() =>
  suspectProfiles.find((person) => person.id === selectedSuspectId.value),
)
const canConverseWithSelectedSuspect = computed(
  () => selectedSuspect.value?.locationId === location.value.id,
)
const availableActions = computed<readonly InvestigationAction[]>(() =>
  (['examine', 'converse', 'analyse', 'research'] as const).filter((action) =>
    action === 'converse'
      ? Boolean(session.remoteMatch && canConverseWithSelectedSuspect.value)
      : session.canExecute(action, location.value.id),
  ),
)
const actionCosts = computed(() => ({
  examine: session.actionCost('examine', location.value.id),
  converse: session.actionCost('converse', location.value.id),
  analyse: session.actionCost('analyse', location.value.id),
  research: session.actionCost('research', location.value.id),
}))
const hasConfirmedRaulEvidence = computed(() =>
  session.journalEntries.some(
    (entry) =>
      entry.type === 'clue' &&
      entry.status === 'confirmed' &&
      `${entry.title} ${entry.content}`.toLocaleLowerCase('pt-BR').includes('raul'),
  ),
)
const journalTab = ref<'timeline' | 'clues' | 'suspects' | 'notes'>('timeline')
const showAccusation = ref(false)
const accusationError = ref<string | null>(null)
const confirmedClues = computed(() =>
  session.journalEntries.filter((entry) => entry.type === 'clue' && entry.status === 'confirmed'),
)
const hasFreeJournalConnection = computed(() =>
  Boolean(
    session.remoteMatch?.hasFreeConnectionThisRound &&
    !session.remoteMatch.hasUsedFreeConnectionThisRound,
  ),
)
const hasPreparedConnectionCard = computed(() =>
  ['route-map', 'comparative-magnifier', 'cross-reference'].includes(
    session.preparedCard?.id ?? '',
  ),
)
const conversation = ref<ConversationOptions | null>(null)
const toolbar = ref<InstanceType<typeof CaseToolbar> | null>(null)
const { open, pinned, enter, leave, toggle, pin, close } = useJournalDisclosure(() =>
  toolbar.value?.focusBookmark(),
)

async function executeAction(action: InvestigationAction) {
  const labels: Record<InvestigationAction, string> = {
    move: 'Deslocar-se',
    examine: 'Examinar',
    converse: 'Conversar',
    analyse: 'Analisar',
    research: 'Pesquisar',
    card: 'Usar carta',
  }
  const preparedCard = session.preparedCard
  try {
    const effectiveCost = session.actionCost(action, location.value.id)
    const journalEntry = await session.resolveAction(action, location.value.id)
    feedback.value = feedbackFromEntry(
      journalEntry,
      `${labels[action]} · ${location.value.name}`,
      effectiveCost,
      preparedCard?.name ?? null,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : `${labels[action]}: PA insuficientes.`,
    )
  }
}

async function moveToLocation() {
  selectedSuspectId.value = findSuspectIdAtLocation(locationId.value)
  if (locationId.value === session.currentLocationId) return
  if (session.connectionState !== 'connected') return
  const moveWasFree = session.moveCostLabel !== '1 PA'
  try {
    await session.moveInvestigator(locationId.value)
    feedback.value = statusFeedback(
      `Deslocamento · ${location.value.name} · ${moveWasFree ? 'Gratuito nesta rodada.' : '1 PA gasto.'}`,
    )
  } catch (error) {
    locationId.value = session.currentLocationId
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível se deslocar.',
    )
  }
}

async function requestSupportCard() {
  if (session.isRequestPending || isSupportRequestPending.value || session.hasUsedSupportThisRound)
    return
  isSupportRequestPending.value = true
  try {
    await session.requestSupportCard()
    feedback.value = statusFeedback(
      `Apoio de ${session.support?.name} acionado. A carta recebida custa 1 PA a menos.`,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível acionar o apoio.',
    )
  } finally {
    isSupportRequestPending.value = false
  }
}

async function retryConnection() {
  if (session.isRequestPending) return
  try {
    await session.retryConnection()
  } catch {
    feedback.value = statusFeedback('A conexão falhou. Verifique a API e tente novamente.')
  }
}

function executeSelectedAction(action: InvestigationAction) {
  if (action === 'converse') {
    if (selectedSuspectId.value && canConverseWithSelectedSuspect.value) {
      void openConversation(selectedSuspectId.value)
    }
    return
  }
  void executeAction(action)
}

async function prepareCard(instanceId: string) {
  try {
    if (!(await session.prepareCard(instanceId))) return
    feedback.value = statusFeedback(
      `${session.preparedCard?.name}: escolha uma ação compatível para aplicá-la.`,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível preparar a carta.',
    )
  }
}

async function clearPreparedCard() {
  try {
    await session.clearPreparedCard()
    feedback.value = statusFeedback('Preparação removida. Escolha outra carta ou uma ação básica.')
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível remover a preparação.',
    )
  }
}

async function endTurn() {
  try {
    if (!(await session.endRemoteTurn())) return
    feedback.value = statusFeedback(
      session.remoteMatch?.status === 'lost'
        ? 'Missão encerrada sem uma acusação sustentada.'
        : `Rodada ${String(session.round).padStart(2, '0')} iniciada: mão renovada e PA restaurados.`,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível encerrar o turno.',
    )
  }
}

async function accuseSuspect(submission: AccusationSubmission) {
  accusationError.value = null
  try {
    await session.accuse(submission)
    showAccusation.value = false
    feedback.value = statusFeedback(
      session.remoteMatch?.status === 'won'
        ? 'O dossiê foi aceito. O caso está resolvido.'
        : 'A acusação não foi sustentada. A investigação foi encerrada.',
    )
  } catch (error) {
    accusationError.value =
      error instanceof Error ? error.message : 'Não foi possível apresentar a acusação.'
  }
}

function openAccusation() {
  showAccusation.value = true
  accusationError.value = null
}

async function discardPreparedCard() {
  try {
    if (!(await session.discardPreparedCard())) return
    feedback.value = statusFeedback('Carta descartada e mão recomposta.')
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível descartar a carta.',
    )
  }
}

async function createJournalConnection(fromClueId: string, toClueId: string) {
  const isFree = hasFreeJournalConnection.value || hasPreparedConnectionCard.value
  try {
    await session.createJournalConnection(fromClueId, toClueId)
    feedback.value = statusFeedback(
      `Conexão formal criada · ${isFree ? 'Grátis' : '1 PA de pesquisa gasto.'}`,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível criar a conexão.',
    )
  }
}

async function openConversation(personId: SuspectId) {
  try {
    conversation.value = await session.loadConversationOptions(personId, location.value.id)
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível abrir a conversa.',
    )
  }
}

async function resolveConversation(questionId: string) {
  const activeConversation = conversation.value
  if (!activeConversation) return
  const preparedCard = session.preparedCard
  const questionCost =
    activeConversation.questions.find((question) => question.id === questionId)?.cost ?? 0
  try {
    const entry = await session.resolveConversation(
      activeConversation.personId as SuspectId,
      questionId,
      location.value.id,
    )
    feedback.value = feedbackFromEntry(
      entry,
      `Conversar · ${activeConversation.personName}`,
      questionCost + (preparedCard?.cost ?? 0),
      preparedCard?.name ?? null,
    )
    conversation.value = await session.loadConversationOptions(
      activeConversation.personId as SuspectId,
      location.value.id,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível resolver a pergunta.',
    )
  }
}

async function prepareConversationCard(instanceId: string) {
  const activeConversation = conversation.value
  if (!activeConversation) return
  try {
    if (!(await session.prepareCard(instanceId))) return
    feedback.value = statusFeedback('Carta preparada para esta conversa.')
    conversation.value = await session.loadConversationOptions(
      activeConversation.personId as SuspectId,
      location.value.id,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível preparar a carta.',
    )
  }
}

async function clearConversationCardPreparation() {
  const activeConversation = conversation.value
  if (!activeConversation) return
  try {
    await session.clearPreparedCard()
    feedback.value = statusFeedback('Preparação removida.')
    conversation.value = await session.loadConversationOptions(
      activeConversation.personId as SuspectId,
      location.value.id,
    )
  } catch (error) {
    feedback.value = statusFeedback(
      error instanceof Error ? error.message : 'Não foi possível remover a preparação.',
    )
  }
}
</script>

<template>
  <main
    id="main"
    class="investigation-page"
    :class="{ 'journal-is-open': open }"
    :inert="session.isRequestPending"
    :aria-busy="session.isRequestPending"
    @keydown.esc="close"
  >
    <section
      v-if="session.remoteMatch?.status === 'won' || session.remoteMatch?.status === 'lost'"
      class="case-outcome"
      role="alert"
      aria-live="assertive"
    >
      <h2>{{ session.remoteMatch.status === 'won' ? 'Caso resolvido' : 'Missão encerrada' }}</h2>
      <p>
        {{
          session.remoteMatch.status === 'won'
            ? 'O dossiê sustentou a acusação.'
            : 'A investigação terminou sem uma acusação sustentada.'
        }}
      </p>
    </section>
    <div
      v-if="session.connectionState !== 'connected' && !session.isRequestPending"
      class="connection-state"
      :role="session.connectionState === 'error' ? 'alert' : 'status'"
      :aria-live="session.connectionState === 'error' ? 'assertive' : 'polite'"
    >
      <strong>
        {{
          session.connectionState === 'connecting'
            ? 'Conectando à investigação'
            : session.connectionState === 'error'
              ? 'API indisponível'
              : 'Partida ainda sem conexão'
        }}
      </strong>
      <span>
        {{
          session.connectionError ??
          (session.connectionState === 'idle'
            ? 'Conecte-se à API para iniciar ações.'
            : 'Aguarde enquanto a partida é iniciada.')
        }}
      </span>
      <button type="button" @click="retryConnection">
        {{
          session.remoteMatch
            ? 'Verificar conexão'
            : session.connectionState === 'error'
              ? 'Tentar iniciar novamente'
              : 'Conectar à API'
        }}
      </button>
    </div>
    <CaseToolbar
      ref="toolbar"
      :open="open"
      :pinned="pinned"
      :round="session.round"
      @enter="enter"
      @leave="leave"
      @toggle="toggle"
    />
    <div class="investigation-layout">
      <LocationsPanel
        v-model="locationId"
        :investigator="session.investigator"
        :support="session.support"
        :points-label="session.pointsLabel"
        :unlocked-locations="session.unlockedLocations"
        :move-cost-label="session.moveCostLabel"
        :has-used-support-this-round="session.hasUsedSupportThisRound"
        :is-support-request-pending="isSupportRequestPending"
        :is-connected="session.connectionState === 'connected'"
        @select="moveToLocation"
        @request-support="requestSupportCard"
      />
      <InvestigationScene
        :location="location"
        :has-confirmed-raul-evidence="hasConfirmedRaulEvidence"
        :round="session.round"
      />
      <SuspectSection v-model="selectedSuspectId" :location="location" />
      <CardHand
        :cards="cards"
        :owner-label="session.investigator?.name ?? ''"
        :prepared-card-id="session.preparedCard?.instanceId ?? null"
        :can-discard-prepared-card="session.canDiscardPreparedCard"
        :compact-actions="open"
        @prepare="prepareCard"
        @clear-prepared="clearPreparedCard"
        @discard-prepared="discardPreparedCard"
      />
      <InvestigationActions
        :available-actions="availableActions"
        :action-costs="actionCosts"
        :feedback="feedback"
        :can-end-turn="session.canEndTurn"
        :can-accuse="session.canAccuse"
        :round="session.round"
        @execute="executeSelectedAction"
        @end-turn="endTurn"
        @accuse="openAccusation"
      />
      <CaseJournal
        v-if="open"
        v-model:notes="session.notes"
        v-model:tab="journalTab"
        :hypotheses="session.hypotheses"
        :journal-entries="session.journalEntries"
        :journal-connections="session.journalConnections"
        :has-free-connection="hasFreeJournalConnection"
        :has-prepared-connection-card="hasPreparedConnectionCard"
        @save="session.saveNote()"
        @create-connection="createJournalConnection"
        @enter="enter"
        @leave="leave"
        @pin="pin"
        @close="close"
      />
    </div>
    <CaseIntroduction v-if="!session.introductionSeen" @close="session.introductionSeen = true" />
    <ConversationDialog
      v-if="conversation"
      :conversation="conversation"
      :points-label="session.pointsLabel"
      :conversation-cards="cards"
      :prepared-card-id="session.preparedCard?.instanceId ?? null"
      @close="conversation = null"
      @resolve="resolveConversation"
      @prepare-card="prepareConversationCard"
      @clear-prepared-card="clearConversationCardPreparation"
    />
    <AccusationDialog
      v-if="showAccusation && session.remoteMatch?.status === 'active'"
      :suspects="suspectProfiles"
      :confirmed-clues="confirmedClues"
      :connection-count="session.journalConnections.length"
      :action-points="session.remoteMatch.actionPoints"
      :error-message="accusationError"
      @close="showAccusation = false"
      @accuse="accuseSuspect"
    />
  </main>
</template>
