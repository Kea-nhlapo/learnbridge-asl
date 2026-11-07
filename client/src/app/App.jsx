import React from 'react';
import LandingPage from '../features/landing/LandingPage.jsx';
import DemoJourney from '../features/demo-journey/DemoJourney.jsx';

const NiaLab = React.lazy(() => import('../features/nia/NiaLab.jsx'));
const NiaSign = React.lazy(() => import('../features/nia/NiaSign.jsx'));
const SignIntroduction = React.lazy(() => import('../features/sign-conversation/SignConversation.jsx'));
const SignCalibration = React.lazy(() => import('../features/sign-conversation/SignCalibration.jsx'));

export default function App() {
  const pathname = window.location.pathname;
  // Keep the prototype URL working for existing bookmarks and demos.
  if (['/app', '/vision-demo'].includes(pathname)) return <DemoJourney />;
  if (pathname === '/nia-sign') return <React.Suspense fallback={<p>Loading Nia…</p>}><NiaSign /></React.Suspense>;
  if (pathname === '/nia-lab') return <React.Suspense fallback={<p>Loading Nia lab…</p>}><NiaLab /></React.Suspense>;
  if (pathname === '/sign-introduction') return <React.Suspense fallback={<p>Loading sign introduction…</p>}><SignIntroduction /></React.Suspense>;
  if (pathname === '/sign-calibration') return <React.Suspense fallback={<p>Loading calibration…</p>}><SignCalibration /></React.Suspense>;
  return <LandingPage />;
}
