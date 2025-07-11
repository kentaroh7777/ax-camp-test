import { SettingsService } from '@/services/application/settings.service';
import { AppSettings } from '@/types/services/settings.types';

export interface SettingsModalProps {
  visible: boolean;
  settingsService: SettingsService;
  onCancel: () => void;
  onSave?: (settings: AppSettings) => void;
}

export interface SettingsModalState {
  loading: boolean;
  initialLoading: boolean;
  error: string | null;
  currentSettings: AppSettings | null;
}

export interface SettingsTabItem {
  key: string;
  label: string;
  children: React.ReactNode;
}