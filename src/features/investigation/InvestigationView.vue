<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { suspectProfiles } from '../../content/case01'
import { useInvestigationStore } from '../../stores/investigation'
import type { InvestigationAction } from '../../domain/game/action-points'
import { useTableNotifications } from './composables/useTableNotifications'
import { useTableTour } from './composables/useTableTour'
import TableTour from './components/TableTour.vue'
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
import AppToast from '../../components/ui/AppToast.vue'
import AppModal from '../../components/ui/AppModal.vue'
import { statusFeedback } from './action-feedback'
import { PhBookOpenText } from '../../components/icons'
import { useTableContext } from './composables/useTableContext'
import { useTableConversation } from './composables/useTableConversation'
import { useTableHand } from './composables/useTableHand'
import { useCaseLifecycle } from './composables/useCaseLifecycle'
import { useTableActions } from './composables/useTableActions'
import './investigation.css'

const session = useInvestigationStore()
const feedback = ref(statusFeedback('Escolha como deseja conduzir a investigação.'))
const cards = computed(() => session.hand)
const journalTab = ref<'timeline' | 'clues' | 'connections' | 'notes'>('timeline')
const panelMode = ref<'people' | 'journal' | 'accusation'>('people')
const { tourStep, tourIndex, startTour, startTourOnFirstVisit, closeTour, stepTour } =
  useTableTour()

onMounted(() => {
  if (session.introductionSeen) startTourOnFirstVisit()
})

function closeIntroduction() {
  session.markIntroductionAsSeen()
  startTourOnFirstVisit()
}

const {
  locationId,
  selectedSuspectId,
  location,
  canConverseWithSelectedSuspect,
  availableActions,
  actionCosts,
  hasUsableActionPoints,
  confirmedClues,
  hasFreeJournalConnection,
  hasPreparedConnectionCard,
} = useTableContext(session)

const {
  conversation,
  conversationAnswer,
  refreshConversation,
  openConversation,
  resolveConversation,
} = useTableConversation(session, location, locationId, selectedSuspectId, panelMode, feedback)

const {
  isSupportRequestPending,
  prepareCard,
  clearPreparedCard,
  discardPreparedCard,
  requestSupportCard,
} = useTableHand(session, feedback, refreshConversation)

const {
  showDeletionConfirmation,
  deletionError,
  accusationError,
  retryConnection,
  requestReturnToWorld,
  deleteCurrentMatch,
  endTurn,
  accuseSuspect,
  openAccusation,
} = useCaseLifecycle(session, feedback, panelMode)

const { executeAction, moveToLocation, createJournalConnection } = useTableActions(
  session,
  feedback,
  location,
  locationId,
  selectedSuspectId,
  hasFreeJournalConnection,
  hasPreparedConnectionCard,
)

const { notifications, unreadCount, dismissNotification } = useTableNotifications(
  () => session.remoteMatch,
  () => panelMode.value === 'journal',
)

function openDiscoveryInJournal(id: string) {
  journalTab.value = 'clues'
  panelMode.value = 'journal'
  dismissNotification(id)
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
</script>

<template>
  <main
    id="main"
    class="investigation-page"
    :inert="session.isRequestPending"
    :aria-busy="session.isRequestPending"
    @keydown.esc="closeTour"
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
    <CaseToolbar :round="session.round" @request-return="requestReturnToWorld" />
    <Teleport to=".header-context">
      <button class="tour-trigger" type="button" @click="startTour">
        <PhBookOpenText :size="17" aria-hidden="true" />
        <span>Como funciona a investigação?</span>
      </button>
    </Teleport>
    <AppModal
      v-if="showDeletionConfirmation"
      class="delete-match-dialog"
      labelled-by="delete-match-title"
      @close="showDeletionConfirmation = false"
    >
      <h2 id="delete-match-title">Abandonar esta partida?</h2>
      <p>A partida e seu diário serão removidos permanentemente.</p>
      <p v-if="deletionError" class="delete-match-error" role="alert">{{ deletionError }}</p>
      <div class="delete-match-actions">
        <button type="button" @click="showDeletionConfirmation = false">
          Continuar investigando
        </button>
        <button type="button" :disabled="session.isRequestPending" @click="deleteCurrentMatch">
          Abandonar partida
        </button>
      </div>
    </AppModal>
    <div class="investigation-layout">
      <LocationsPanel
        v-model="locationId"
        :tour-target="tourStep?.target"
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
      <div class="center-zone">
        <InvestigationScene :location="location" :round="session.round" />
        <InvestigationActions
          :class="{ 'tour-highlight': tourStep?.target === 'actions' }"
          :available-actions="availableActions"
          :action-costs="actionCosts"
          :feedback="feedback"
          :can-end-turn="session.canEndTurn"
          :has-usable-action-points="hasUsableActionPoints"
          :round="session.round"
          @execute="executeSelectedAction"
          @end-turn="endTurn"
        />
        <CardHand
          :cards="cards"
          :owner-label="session.investigator?.name ?? ''"
          :prepared-card-id="session.preparedCard?.instanceId ?? null"
          :can-discard-prepared-card="session.canDiscardPreparedCard"
          :owner-id="session.investigatorId ?? undefined"
          :class="{ 'tour-highlight': tourStep?.target === 'hand' }"
          @prepare="prepareCard"
          @clear-prepared="clearPreparedCard"
          @discard-prepared="discardPreparedCard"
        />
      </div>
      <aside
        class="panel contextual-panel"
        :class="{ 'tour-highlight': tourStep?.target === 'context' }"
        aria-label="Painel contextual"
      >
        <nav class="mode-tabs" aria-label="Modos do painel">
          <button :aria-pressed="panelMode === 'people'" @click="panelMode = 'people'">
            Pessoas
          </button>
          <button
            class="journal-mode-tab"
            :aria-pressed="panelMode === 'journal'"
            @click="panelMode = 'journal'"
          >
            Diário
            <span
              v-if="unreadCount"
              class="journal-unread-count"
              :aria-label="unreadCount + ' itens não lidos'"
              >{{ unreadCount }}</span
            >
          </button>
          <button
            :aria-pressed="panelMode === 'accusation'"
            :disabled="!session.canAccuse"
            @click="openAccusation"
          >
            Acusação
          </button>
        </nav>
        <div class="contextual-content">
          <div v-show="panelMode === 'people'" class="contextual-view">
            <SuspectSection
              v-model="selectedSuspectId"
              :location="location"
              :is-conversing="Boolean(conversation)"
              @converse="executeSelectedAction('converse')"
            >
              <ConversationDialog
                v-if="conversation"
                :conversation="conversation"
                :answer="conversationAnswer"
                @close="conversation = null"
                @resolve="resolveConversation"
              />
            </SuspectSection>
          </div>
          <CaseJournal
            v-show="panelMode === 'journal'"
            v-model:notes="session.notes"
            v-model:tab="journalTab"
            :hypotheses="session.hypotheses"
            :journal-entries="session.journalEntries"
            :journal-connections="session.journalConnections"
            :has-free-connection="hasFreeJournalConnection"
            :has-prepared-connection-card="hasPreparedConnectionCard"
            @save="session.saveNote()"
            @create-connection="createJournalConnection"
          />
          <AccusationDialog
            v-if="session.remoteMatch && session.canAccuse"
            v-show="panelMode === 'accusation'"
            :suspects="suspectProfiles"
            :confirmed-clues="confirmedClues"
            :connection-count="session.journalConnections.length"
            :action-points="session.remoteMatch.actionPoints"
            :error-message="accusationError"
            @accuse="accuseSuspect"
          />
        </div>
      </aside>
    </div>
    <CaseIntroduction v-if="!session.introductionSeen" @close="closeIntroduction" />
    <div class="toast-stack">
      <AppToast
        v-for="notification in notifications"
        :key="notification.id"
        :message="notification.message"
        :kind="notification.kind"
        @open-journal="openDiscoveryInJournal(notification.id)"
        @dismiss="dismissNotification(notification.id)"
      />
    </div>
    <TableTour
      v-if="tourStep"
      :step="tourStep"
      :index="tourIndex"
      @step="stepTour"
      @close="closeTour"
    />
  </main>
</template>
