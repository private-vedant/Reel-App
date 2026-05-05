import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';

type Tab = 'feed' | 'reels' | 'settings';
type Theme = 'dark' | 'light';

// ─── Layout constants ────────────────────────────────────────────────────────
const NAV_HEIGHT = 76;                                    // fix 1: reduced nav height = less gap
const GESTURE_INSET = Platform.OS === 'android' ? 24 : 0;
const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// fix 1: VIDEO_HEIGHT now fills right up to the nav bar — no extra gap
const VIDEO_HEIGHT = SCREEN_HEIGHT - NAV_HEIGHT - GESTURE_INSET;

// fix 4: perfect 3-column grid with exact pixel math
const GRID_GAP = 3;
const GRID_COLS = 3;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH / 0.72; // maintain portrait aspect ratio

// ─── Video data ──────────────────────────────────────────────────────────────
// Each video now carries sample tags for the pill display (fix 5)
const videos = [
  {
    id: 'video-1',
    title: 'Video 1',
    tags: ['Nature', 'Aerial', 'Cinematic'],
    source: require('../../assets/videos/VID_20260425_032402_349.mp4'),
  },
  {
    id: 'video-2',
    title: 'Video 2',
    tags: ['Travel', 'Sunset'],
    source: require('../../assets/videos/VID_20260304_223952_738.mp4'),
  },
  {
    id: 'video-3',
    title: 'Video 3',
    tags: ['Urban', 'Street', 'Night'],
    source: require('../../assets/videos/VID_20260214_190958_137.mp4'),
  },
  {
    id: 'video-4',
    title: 'Video 4',
    tags: ['Lifestyle'],
    source: require('../../assets/videos/VID_20260210_023909_596.mp4'),
  },
  {
    id: 'video-5',
    title: 'Video 5',
    tags: ['Sports', 'Action'],
    source: require('../../assets/videos/VID_20260210_022238_888.mp4'),
  },
  {
    id: 'video-6',
    title: 'Video 6',
    tags: ['Food', 'Cooking', 'Recipe'],
    source: require('../../assets/videos/VID_20260210_021721_055.mp4'),
  },
  {
    id: 'video-7',
    title: 'Video 7',
    tags: ['Music', 'Live'],
    source: require('../../assets/videos/VID_20260210_021318_411.mp4'),
  },
  {
    id: 'video-8',
    title: 'Video 8',
    tags: ['Tech', 'Review'],
    source: require('../../assets/videos/VID_20260210_021253_958.mp4'),
  },
  {
    id: 'video-9',
    title: 'Video 9',
    tags: ['Tech', 'Review'],
    source: require('../../assets/videos/VID_20260219_002548_856.mp4'),
  },
  {
    id: 'video-10',
    title: 'Video 10',
    tags: ['Tech', 'Review'],
    source: require('../../assets\videos\VID_20260219_003727_347.mp4'),
  },
  {
    id: 'video118',
    title: 'Video 11',
    tags: ['Tech', 'Review'],
    source: require('../../assets\videos\VID_20260224_090040_811.mp4'),
  },
  {
    id: 'video-12',
    title: 'Video 12',
    tags: ['Tech', 'Review'],
    source: require('../../assets\videos\VID_20260224_090208_250.mp4'),
  },
];

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#0D0D0D',
    chip: '#2A2A2A',
    pillBg: 'rgba(255,255,255,0.15)',
    pillText: '#FFFFFF',
    text: '#F5F5F5',
    subtext: '#888888',
    border: '#2A2A2A',
    navBg: '#111111',
    navBorder: '#222222',
    activeTab: '#F5F5F5',
    activeTabText: '#111111',
    switchTrackOn: '#AAAAAA',
  },
  light: {
    bg: '#FFFFFF',
    chip: '#E8E8E8',
    pillBg: 'rgba(0,0,0,0.55)',
    pillText: '#FFFFFF',
    text: '#111111',
    subtext: '#666666',
    border: '#E6E8EB',
    navBg: '#FFFFFF',
    navBorder: '#E6E8EB',
    activeTab: '#111111',
    activeTabText: '#FFFFFF',
    switchTrackOn: '#555555',
  },
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [activeTab, setActiveTab] = useState<Tab>('feed');
  const [prevTab, setPrevTab] = useState<Tab>('reels');
  // fix 3: which library video is currently previewed (null = none)
  const [previewVideo, setPreviewVideo] = useState<(typeof videos)[0] | null>(null);

  const t = THEMES[theme];

  const openSettings = () => {
    setPrevTab(activeTab === 'settings' ? prevTab : activeTab);
    setActiveTab('settings');
  };
  const closeSettings = () => setActiveTab(prevTab);

  // fix 2: horizontal swipe between feed ↔ reels tabs
  // Only active when settings is not open
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => {
        const h = Math.abs(g.dx);
        const v = Math.abs(g.dy);
        return h > 20 && h > v * 1.5;
      },
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) {
          // swipe left → go to reels
          setActiveTab((cur) => (cur === 'feed' ? 'reels' : cur));
        }
        if (g.dx > 50) {
          // swipe right → go to feed
          setActiveTab((cur) => (cur === 'reels' ? 'feed' : cur));
        }
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.navBg }]}>
      {/* fix 2: attach swipe handlers to the whole app shell */}
      <View
        style={[styles.app, { backgroundColor: t.bg }]}
        {...(activeTab !== 'settings' ? swipePan.panHandlers : {})}
      >
        <View style={styles.content}>
          {activeTab === 'feed' && <FeedScreen t={t} />}
          {activeTab === 'reels' && (
            <ReelsScreen
              t={t}
              onOpenSettings={openSettings}
              onPreviewVideo={setPreviewVideo}
            />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              theme={theme}
              t={t}
              onToggleTheme={() =>
                setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
              }
              onBack={closeSettings}
            />
          )}
        </View>

        {activeTab !== 'settings' && (
          <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} t={t} />
        )}

        {/* fix 3: fullscreen video preview modal for library taps */}
        {previewVideo && (
          <VideoPreviewModal
            video={previewVideo}
            onClose={() => setPreviewVideo(null)}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────
type FeedScreenProps = { t: typeof THEMES.dark };

function FeedScreen({ t }: FeedScreenProps) {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [pausedMap, setPausedMap] = useState<Record<number, boolean>>({});
  const [showIconMap, setShowIconMap] = useState<Record<number, boolean>>({});

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        setActiveVideoIndex(idx);
        setPausedMap((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [],
  );

  const togglePlayPause = (index: number) => {
    setPausedMap((prev) => ({ ...prev, [index]: !prev[index] }));
    setShowIconMap((prev) => ({ ...prev, [index]: true }));
    setTimeout(
      () => setShowIconMap((prev) => ({ ...prev, [index]: false })),
      700,
    );
  };

  return (
    <View style={styles.feedScreen}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={VIDEO_HEIGHT}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.92}
        disableIntervalMomentum
        getItemLayout={(_, index) => ({
          length: VIDEO_HEIGHT,
          offset: VIDEO_HEIGHT * index,
          index,
        })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index }) => {
          const isActive = index === activeVideoIndex;
          const isPaused = !!pausedMap[index];
          const showIcon = !!showIconMap[index];
          return (
            <View style={styles.videoPage}>
              <Video
                source={item.source}
                style={styles.video}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={isActive && !isPaused}
                isLooping
                isMuted={false}
              />

              {/* tap centre → play/pause */}
              <TouchableOpacity
                activeOpacity={1}
                style={styles.tapOverlay}
                onPress={() => togglePlayPause(index)}
              >
                {showIcon && (
                  <View style={styles.playPauseIconWrap}>
                    <Ionicons
                      name={isPaused ? 'play' : 'pause'}
                      size={52}
                      color="#FFFFFF"
                    />
                  </View>
                )}
              </TouchableOpacity>

              {/* fix 5: title + tag pills, moved higher (bottom: 64) */}
              <View style={styles.videoMeta}>
                <Text style={styles.videoTitle}>{item.title}</Text>
                <View style={styles.tagPillRow}>
                  {item.tags.slice(0, 3).map((tag) => (
                    <View
                      key={tag}
                      style={[styles.tagPill, { backgroundColor: t.pillBg }]}
                    >
                      <Text style={[styles.tagPillText, { color: t.pillText }]}>
                        {tag}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              {/* action buttons */}
              <View style={styles.feedActions}>
                <RoundIconButton icon="heart" label="Like" color="#FFFFFF" iconColor="#111111" onPress={() => {}} />
                <RoundIconButton icon="bookmark-outline" label="Save" color="#FFFFFF" iconColor="#111111" onPress={() => {}} />
                <RoundIconButton icon="share-social" label="Share" color="#FFFFFF" iconColor="#111111" onPress={() => {}} />
              </View>
            </View>
          );
        }}
      />
    </View>
  );
}

// ─── ReelsScreen (Library) ────────────────────────────────────────────────────
type ReelsScreenProps = {
  t: typeof THEMES.dark;
  onOpenSettings: () => void;
  onPreviewVideo: (v: (typeof videos)[0]) => void;      // fix 3
};

function ReelsScreen({ t, onOpenSettings, onPreviewVideo }: ReelsScreenProps) {
  return (
    <View style={[styles.reelsScreen, { backgroundColor: t.bg }]}>
      {/* header clears status bar */}
      <View style={[styles.reelsHeader, { paddingTop: STATUS_BAR_HEIGHT + 16 }]}>
        {/*
          ── LOGO SLOT ────────────────────────────────────────────────────────
          Replace the View below with your logo <Image>:
            <Image source={require('../../assets/logo.png')} style={styles.appLogo} resizeMode="contain" />
          ─────────────────────────────────────────────────────────────────── */}
        <View style={styles.appLogo} />

        <View style={styles.headerActions}>
          <RoundIconButton icon="search" label="Search" size={42} color={t.chip} iconColor={t.text} onPress={() => {}} />
          <RoundIconButton icon="settings" label="Settings" size={42} color={t.chip} iconColor={t.text} onPress={onOpenSettings} />
        </View>
      </View>

      {/* filter chip row */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        {['All', 'Nature', 'Travel', 'Urban', 'Sports', 'Food'].map((label) => (
          <View key={label} style={[styles.tagCard, { backgroundColor: t.chip }]}>
            <Text style={[styles.tagText, { color: t.text }]}>{label}</Text>
          </View>
        ))}
      </ScrollView>

      {/*
        fix 4: perfect 3-column grid
        – No numColumns + FlatList (which can leave orphaned items unaligned)
        – Instead use a manual row-building approach with exact pixel widths
        – This guarantees every row has exactly 3 items regardless of video count
      */}
      <FlatList
        data={buildRows(videos, GRID_COLS)}
        keyExtractor={(_, i) => `row-${i}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.videoGrid}
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((video) =>
              video ? (
                // fix 3: tap opens fullscreen preview
                <TouchableOpacity
                  key={video.id}
                  style={styles.gridItem}
                  activeOpacity={0.85}
                  onPress={() => onPreviewVideo(video)}
                >
                  <Video
                    source={video.source}
                    style={styles.gridVideo}
                    resizeMode={ResizeMode.COVER}
                    shouldPlay={false}
                    isMuted
                  />
                </TouchableOpacity>
              ) : (
                // empty filler cell so last row stays aligned
                <View key={`empty-${Math.random()}`} style={styles.gridItem} />
              ),
            )}
          </View>
        )}
      />
    </View>
  );
}

/** Split a flat array into rows of `cols` items, padding the last row with nulls */
function buildRows<T>(arr: T[], cols: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < arr.length; i += cols) {
    const row = arr.slice(i, i + cols) as (T | null)[];
    while (row.length < cols) row.push(null);
    rows.push(row);
  }
  return rows;
}

// ─── VideoPreviewModal (fix 3) ────────────────────────────────────────────────
type VideoPreviewModalProps = {
  video: (typeof videos)[0];
  onClose: () => void;
};

function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const [paused, setPaused] = useState(false);
  const [showIcon, setShowIcon] = useState(false);

  const togglePause = () => {
    setPaused((p) => !p);
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 700);
  };

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.previewContainer}>
        <Video
          source={video.source}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay={!paused}
          isLooping
          isMuted={false}
        />

        {/* tap centre to play/pause */}
        <TouchableOpacity
          activeOpacity={1}
          style={styles.previewTap}
          onPress={togglePause}
        >
          {showIcon && (
            <View style={styles.playPauseIconWrap}>
              <Ionicons name={paused ? 'play' : 'pause'} size={52} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>

        {/* close button */}
        <Pressable style={styles.previewClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>

        {/* title + pills */}
        <View style={styles.previewMeta}>
          <Text style={styles.previewTitle}>{video.title}</Text>
          <View style={styles.tagPillRow}>
            {video.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={[styles.tagPill, { backgroundColor: 'rgba(255,255,255,0.18)' }]}>
                <Text style={[styles.tagPillText, { color: '#FFFFFF' }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
type SettingsScreenProps = {
  theme: Theme;
  t: typeof THEMES.dark;
  onToggleTheme: () => void;
  onBack: () => void;
};

function SettingsScreen({ theme, t, onToggleTheme, onBack }: SettingsScreenProps) {
  return (
    <View style={[styles.settingsScreen, { backgroundColor: t.bg, paddingTop: STATUS_BAR_HEIGHT + 16 }]}>
      <View style={styles.settingsHeader}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.backButton, { backgroundColor: t.chip, opacity: pressed ? 0.6 : 1 }]}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.settingsTitle, { color: t.text }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.settingSection, { borderColor: t.border }]}>
        <View style={[styles.settingRow, { borderBottomColor: t.border }]}>
          <View style={styles.settingLabelWrap}>
            <Ionicons name="moon" size={20} color={t.subtext} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.settingLabel, { color: t.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc, { color: t.subtext }]}>{theme === 'dark' ? 'On' : 'Off'}</Text>
            </View>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={onToggleTheme}
            trackColor={{ false: '#D0D0D0', true: t.switchTrackOn }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>
    </View>
  );
}

// ─── BottomTabs ───────────────────────────────────────────────────────────────
type BottomTabsProps = { activeTab: Tab; onChangeTab: (tab: Tab) => void; t: typeof THEMES.dark };

function BottomTabs({ activeTab, onChangeTab, t }: BottomTabsProps) {
  return (
    <View
      style={[
        styles.bottomTabs,
        {
          backgroundColor: t.navBg,
          borderTopColor: t.navBorder,
          paddingBottom: GESTURE_INSET,
          height: NAV_HEIGHT + GESTURE_INSET,
        },
      ]}
    >
      <TabButton icon="home" label="Home" active={activeTab === 'feed'} onPress={() => onChangeTab('feed')} t={t} />
      <TabButton icon="film" label="Reels" active={activeTab === 'reels'} onPress={() => onChangeTab('reels')} t={t} />
    </View>
  );
}

// ─── Reusable small components ────────────────────────────────────────────────
type TabButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  t: typeof THEMES.dark;
};

function TabButton({ icon, label, active, onPress, t }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tabButton, active && { backgroundColor: t.activeTab }]}
    >
      <Ionicons name={icon} size={25} color={active ? t.activeTabText : t.subtext} />
    </Pressable>
  );
}

type RoundIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  size?: number;
  onPress: () => void;
};

function RoundIconButton({ icon, label, color, iconColor, size = 52, onPress }: RoundIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundIconButton,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        pressed && styles.pressedButton,
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={iconColor} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  app: { flex: 1 },
  content: { flex: 1, paddingBottom: NAV_HEIGHT + GESTURE_INSET },

  // ── Feed ──────────────────────────────────────────────────────────────────
  feedScreen: { flex: 1, backgroundColor: '#000000' },
  // fix 1: VIDEO_HEIGHT = screen − nav − gesture inset; no extra margin
  videoPage: { height: VIDEO_HEIGHT, backgroundColor: '#000000' },
  video: { ...StyleSheet.absoluteFillObject },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 72,
  },
  playPauseIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 50,
    padding: 16,
  },
  // fix 5: title + pills block, positioned higher so there's breathing room
  videoMeta: {
    position: 'absolute',
    left: 18,
    right: 96,
    bottom: 64,          // raised from 28 → 64
    gap: 8,
  },
  videoTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  tagPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagPillText: { fontSize: 12, fontWeight: '600' },
  feedActions: { position: 'absolute', right: 16, bottom: 64, gap: 14 },

  // ── Reels / Library ───────────────────────────────────────────────────────
  reelsScreen: { flex: 1 },
  reelsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 4,
  },
  appLogo: { width: 120, height: 36 }, // swap for <Image> when ready
  headerActions: { flexDirection: 'row', gap: 10 },
  chipScroll: { marginTop: 14, flexGrow: 0 },
  chipScrollContent: { paddingHorizontal: 18, gap: 8 },
  tagCard: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9 },
  tagText: { fontSize: 14, fontWeight: '700' },

  // fix 4: pixel-perfect 3-column grid using manual row layout
  videoGrid: { paddingTop: 14, paddingBottom: 24 },
  gridRow: {
    flexDirection: 'row',
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
  },
  gridVideo: { width: '100%', height: '100%' },

  // ── Video preview modal (fix 3) ───────────────────────────────────────────
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewTap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 16,
    left: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    padding: 8,
  },
  previewMeta: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 60,
    gap: 8,
  },
  previewTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  // ── Settings ──────────────────────────────────────────────────────────────
  settingsScreen: { flex: 1, paddingHorizontal: 18 },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  settingsTitle: { fontSize: 20, fontWeight: '800' },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  settingSection: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderBottomWidth: 1,
  },
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  settingLabel: { fontSize: 16, fontWeight: '700' },
  settingDesc: { fontSize: 13, marginTop: 2 },

  // ── Bottom nav ─────────────────────────────────────────────────────────────
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    paddingTop: 10,
  },
  tabButton: { alignItems: 'center', borderRadius: 8, height: 48, justifyContent: 'center', width: 76 },

  // ── Shared ─────────────────────────────────────────────────────────────────
  roundIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 5,
  },
  pressedButton: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});






