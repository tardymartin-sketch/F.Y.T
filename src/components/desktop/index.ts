// ===========================================
// F.Y.T - Desktop Components Index
// src/components/desktop/index.ts
// Export centralisé des composants desktop
// ===========================================

// Navigation
export { Sidebar } from './Sidebar';

// Screens
export { HomeDesktop, Home } from './HomeDesktop';
export { ActiveSessionDesktop, ActiveSession } from './ActiveSessionDesktop';
export { HistoryDesktop, History } from './HistoryDesktop';
export { TeamView } from './TeamView';
export { SettingsView } from './SettingsView';
export { AdminUsersView } from './AdminUsersView';
export { StravaImport } from './StravaImport';
export { CoachConversationsView } from './CoachConversationsView';

// Sub-components
export { SessionSelector, SessionSelector as SessionSelectorDesktop } from './SessionSelectorDesktop';
export { SessionView, SessionView as SessionViewDesktop } from './SessionViewDesktop';
export { AthleteGroupsManager } from './AthleteGroupsManager';
export { VisibilitySelector } from './VisibilitySelector';
export { RichTextEditor } from './RichTextEditor';
export { AthleteRpeStats, AthleteRpeStats as TeamViewRpeSection } from './TeamViewRpeSection';
export { StravaActivityMap } from './StravaActivityMap';
export { StravaActivityCharts } from './StravaActivityCharts';
export { StravaHistoryCard } from './StravaHistoryCard';
