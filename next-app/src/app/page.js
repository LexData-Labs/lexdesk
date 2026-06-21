import HomeExperience from '@/components/home/HomeExperience';

// The homepage is a progressive-enhancement shell: it renders the real landing
// (server-side, crawlable) and upgrades to the playable 3D hub on capable
// desktops. See src/components/home/. Only this page changes — every other
// route is untouched.
export default function Home() {
  return <HomeExperience />;
}
