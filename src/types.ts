export type ChatbotConfig = {
  id: string;
  name: string;
  domain: string;
  systemPrompt: string;
  themeColor: string;
  soundEnabled: boolean;
  createdAt: number;
  engineStartMode: 'click' | 'background';
  themeMode: 'light' | 'dark' | 'auto';
  botIcon: string;
  fontFamily: string;
  fontColor: string;
  fontSize: 'text-sm' | 'text-base' | 'text-lg';
  language: string;
};
