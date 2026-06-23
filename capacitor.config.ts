import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'cn.tailmepuppy.tailme',
  appName: 'TailMe',
  webDir: 'out',
  server: {
    // 方案A：App 作为壳，直接加载线上应用（不做静态导出，所有功能/接口/Realtime 照常）
    // 国内真机测试更稳；要切回 Vercel 改成 'https://tailme-app-beta.vercel.app'
    url: 'https://tailmepuppy.cn',
    cleartext: false,
  },
};

export default config;
