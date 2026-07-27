import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'ja';

const translations = {
  en: {
    dashboard: 'Dashboard',
    liveMap: 'Live Factory Map',
    tickets: 'IT Tickets',
    c2dControl: 'C2D Control',
    health: 'System Health',
    adminOverview: 'Admin Operations Overview',
    liveNodes: 'Live Nodes',
    openTickets: 'Open Tickets',
    wsConnected: 'WS CONNECTED',
    wsOffline: 'WS OFFLINE',
    logout: 'Logout',
    commandCenter: 'Command Center',
    zeroTrust: 'Zero-Trust Enterprise Environment',
    adminRole: 'Administrator',
    operatorRole: 'Floor Operator',
    endShift: 'End Shift',
    awaitingTelemetry: 'Awaiting telemetry from edge agent...',
    unknownMachine: 'Unknown Machine',
    coreTemp: 'Core Temp',
    vibration: 'Vibration',
    powerDraw: 'Power Draw',
    rotorRpm: 'Rotor RPM',
    assignedWorkOrders: 'Assigned Work Orders',
    activeAlerts: 'Active Alerts',
    noWorkOrders: 'No work orders assigned yet. Admin will dispatch experts here.',
    markResolved: 'Mark Issue as Resolved',
    inProgress: 'IN PROGRESS',
    resolved: 'RESOLVED',
    financialImpact: 'Financial Impact',
    liveRevenueLost: 'Live Revenue Lost',
    revenueSaved: 'Revenue Saved (vs Manual)',
    costPerMin: '₹290/min per offline node',
    expertAssigned: 'Expert Assigned to You!',
    dispatchedTo: 'has been dispatched to your machine.',
    loginTitle: 'Manufacturing DX',
    loginSubtitle: 'Command Center Authentication',
    fullName: 'Full Name',
    email: 'Email',
    password: 'Password',
    loginBtn: 'Secure Login',
    signupBtn: 'Create Account',
    newEmployee: 'New employee? Create an account.',
    alreadyHaveAccount: 'Already have an account? Login.',
    strictAccess: 'Strict Authenticated Access',
    confirmCode: 'Confirmation Code',
    selectRole: 'Select Role',
    machineId: 'Assigned Machine ID',
    confirmBtn: 'Confirm Account',
    noActiveAlerts: 'No active alerts.'
  },
  ja: {
    dashboard: 'ダッシュボード',
    liveMap: '工場ライブマップ',
    tickets: 'ITチケット',
    c2dControl: 'C2D制御',
    health: 'システム稼働状況',
    adminOverview: '管理者運用概要',
    liveNodes: '稼働中のノード',
    openTickets: '未解決チケット',
    wsConnected: 'WS接続済み',
    wsOffline: 'WSオフライン',
    logout: 'ログアウト',
    commandCenter: 'コマンドセンター',
    zeroTrust: 'ゼロトラスト・エンタープライズ環境',
    adminRole: '管理者',
    operatorRole: '現場オペレーター',
    endShift: '業務終了',
    awaitingTelemetry: 'エッジエージェントからのテレメトリを待機中...',
    unknownMachine: '不明なマシン',
    coreTemp: 'コア温度',
    vibration: '振動',
    powerDraw: '消費電力',
    rotorRpm: 'ローター回転数',
    assignedWorkOrders: '割り当てられた作業指示',
    activeAlerts: 'アクティブなアラート',
    noWorkOrders: '作業指示はまだありません。管理者がここに専門家を派遣します。',
    markResolved: '問題を解決済みとしてマーク',
    inProgress: '進行中',
    resolved: '解決済み',
    financialImpact: '財務的影響',
    liveRevenueLost: 'ライブ損失収益',
    revenueSaved: '節約された収益 (手動比較)',
    costPerMin: 'オフラインノード1台あたり¥525/分',
    expertAssigned: '専門家が割り当てられました！',
    dispatchedTo: 'があなたのマシンに派遣されました。',
    loginTitle: '製造DX',
    loginSubtitle: 'コマンドセンター認証',
    fullName: '氏名',
    email: 'メールアドレス',
    password: 'パスワード',
    loginBtn: '安全なログイン',
    signupBtn: 'アカウント作成',
    newEmployee: '新しい従業員ですか？アカウントを作成。',
    alreadyHaveAccount: 'すでにアカウントをお持ちですか？ログイン。',
    strictAccess: '厳格な認証アクセス',
    confirmCode: '確認コード',
    selectRole: 'ロールを選択',
    machineId: '割り当てられたマシンID',
    confirmBtn: 'アカウント確認',
    noActiveAlerts: 'アクティブなアラートはありません。'
  }
};

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof typeof translations.en) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>('en');

  const t = (key: keyof typeof translations.en): string => {
    return translations[lang][key] || translations.en[key] || key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = () => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
