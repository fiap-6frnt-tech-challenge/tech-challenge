import { Global } from 'recharts';

// Recharts owns internal Redux stores; apply the application's DevTools policy there too.
Global.devToolsEnabled = process.env.NODE_ENV !== 'production';
