import type { AppResult, Review } from "./types";

/** A demo app + reviews so the UI is fully usable without live network access
 *  (handy for local dev, screenshots, or restricted hosting). */
export const SAMPLE_APP: AppResult = {
  id: "com.example.sample",
  title: "Sample Notes App",
  developer: "Demo Labs",
  icon: "",
  url: "#",
  score: 4.3,
  store: "googleplay",
};

export const SAMPLE_REVIEWS: Review[] = [
  { id: "s1", rating: 5, text: "Absolutely love this app. Syncing across my phone and laptop is instant and I've never lost a note." },
  { id: "s2", rating: 4, text: "Great for quick notes. Would be five stars if there was a proper dark mode on tablet." },
  { id: "s3", rating: 2, text: "Crashes every time I try to attach a photo since the last update. Please fix!" },
  { id: "s4", rating: 5, text: "The search is lightning fast and the widgets are genuinely useful. Best note app I've tried." },
  { id: "s5", rating: 1, text: "They moved basic features behind a subscription. Used to be my favourite, now uninstalling." },
  { id: "s6", rating: 3, text: "It's fine. Does what it says but the interface feels a little dated compared to competitors." },
  { id: "s7", rating: 5, text: "Customer support actually replied within an hour and fixed my sync issue. Very impressed." },
  { id: "s8", rating: 4, text: "Handwriting recognition is surprisingly accurate. Battery use could be a bit lower though." },
  { id: "s9", rating: 2, text: "Notifications stopped working on Android 14. Reinstalled twice with no luck." },
  { id: "s10", rating: 5, text: "Clean, fast, no ads on the free tier. Exactly what I wanted from a notes app." },
  { id: "s11", rating: 3, text: "Decent but the export options are limited. I really need PDF export with formatting." },
  { id: "s12", rating: 4, text: "Folders and tags make organising hundreds of notes painless. Solid update this month." },
  { id: "s13", rating: 1, text: "Lost two weeks of notes after a forced logout. No way to recover them. Be careful." },
  { id: "s14", rating: 5, text: "Offline mode is rock solid on the train. Everything syncs the moment I get signal again." },
  { id: "s15", rating: 4, text: "Reminders tied to notes are a game changer for my workflow. Nicely done." },
  { id: "s16", rating: 2, text: "The new layout buried the most-used buttons under a menu. Please bring back the toolbar." },
  { id: "s17", rating: 5, text: "Migrated from a competitor and the import just worked. Zero data loss, huge relief." },
  { id: "s18", rating: 3, text: "Good app overall, but it drains my battery noticeably when background sync is on." },
];
