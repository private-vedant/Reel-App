import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Image,
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

type Tab   = 'feed' | 'reels' | 'settings';
type Theme = 'dark'  | 'light';

// ─── Layout constants ─────────────────────────────────────────────────────────
const NAV_HEIGHT        = 76;
const GESTURE_INSET     = Platform.OS === 'android' ? 24 : 0;
const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT      = SCREEN_HEIGHT - NAV_HEIGHT - GESTURE_INSET;
const GRID_GAP          = 3;
const GRID_COLS         = 3;
const GRID_ITEM_WIDTH   = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const GRID_ITEM_HEIGHT  = GRID_ITEM_WIDTH / 0.72;

// ─── Video data ───────────────────────────────────────────────────────────────
const videos = [
  { id: 'video-1',  title: 'Video 1',  tags: ['Nature', 'Aerial', 'Cinematic'],  source: require('../../assets/videos/VID_20260425_032402_349.mp4') },
  { id: 'video-2',  title: 'Video 2',  tags: ['Travel', 'Sunset'],               source: require('../../assets/videos/VID_20260304_223952_738.mp4') },
  { id: 'video-3',  title: 'Video 3',  tags: ['Urban', 'Street', 'Night'],       source: require('../../assets/videos/VID_20260214_190958_137.mp4') },
  { id: 'video-4',  title: 'Video 4',  tags: ['Lifestyle'],                      source: require('../../assets/videos/VID_20260210_023909_596.mp4') },
  { id: 'video-5',  title: 'Video 5',  tags: ['Sports', 'Action'],               source: require('../../assets/videos/VID_20260210_022238_888.mp4') },
  { id: 'video-6',  title: 'Video 6',  tags: ['Food', 'Cooking', 'Recipe'],      source: require('../../assets/videos/VID_20260210_021721_055.mp4') },
  { id: 'video-7',  title: 'Video 7',  tags: ['Music', 'Live'],                  source: require('../../assets/videos/VID_20260210_021318_411.mp4') },
  { id: 'video-8',  title: 'Video 8',  tags: ['Tech', 'Review'],                 source: require('../../assets/videos/VID_20260210_021253_958.mp4') },
  { id: 'video-9',  title: 'Video 9',  tags: ['Tech', 'Review'],                 source: require('../../assets/videos/VID_20260219_002548_856.mp4') },
  { id: 'video-10', title: 'Video 10', tags: ['Tech', 'Review'],                 source: require('../../assets/videos/VID_20260224_090040_811.mp4') },
  { id: 'video-11', title: 'Video 11', tags: ['Tech', 'Review'],                 source: require('../../assets/videos/VID_20260219_003727_347.mp4') },
  { id: 'video-12', title: 'Video 12', tags: ['Tech', 'Review'],                 source: require('../../assets/videos/VID_20260224_090208_250.mp4') },
];

// ─── Asset URI cache ──────────────────────────────────────────────────────────
const assetUriCache: Partial<Record<string, string>> = {};
const assetUriPromise: Partial<Record<string, Promise<string>>> = {};

async function resolveAssetUri(videoId: string, source: number): Promise<string> {
  const cachedUri = assetUriCache[videoId];
  if (cachedUri) return cachedUri;

  const inFlight = assetUriPromise[videoId];
  if (inFlight) return inFlight;

  const promise = (async () => {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();

    const uri = asset.localUri ?? asset.uri;
    if (!uri) {
      throw new Error(`Unable to resolve asset URI for ${videoId}`);
    }

    assetUriCache[videoId] = uri;
    return uri;
  })().finally(() => {
    delete assetUriPromise[videoId];
  });

  assetUriPromise[videoId] = promise;
  return promise;
}

// ─── Thumbnail store ──────────────────────────────────────────────────────────
type ThumbState = { uri: string | null; error: boolean; loading: boolean };
const thumbStore: Map<string, ThumbState>                       = new Map();
const thumbListeners: Map<string, Set<(s: ThumbState) => void>> = new Map();
const thumbInFlight: Map<string, Promise<void>>                  = new Map();

function getThumbState(videoId: string): ThumbState {
  return thumbStore.get(videoId) ?? { uri: null, error: false, loading: false };
}

function setThumbState(videoId: string, next: ThumbState) {
  thumbStore.set(videoId, next);
  thumbListeners.get(videoId)?.forEach((cb) => cb(next));
}

function subscribeThumb(videoId: string, cb: (s: ThumbState) => void): () => void {
  if (!thumbListeners.has(videoId)) thumbListeners.set(videoId, new Set());
  thumbListeners.get(videoId)!.add(cb);
  return () => thumbListeners.get(videoId)?.delete(cb);
}

function loadThumbnail(videoId: string, source: number) {
  const current = getThumbState(videoId);
  if (current.uri || current.error || thumbInFlight.has(videoId)) return;

  setThumbState(videoId, { uri: null, error: false, loading: true });

  const promise = (async () => {
    try {
      const localUri = await resolveAssetUri(videoId, source);
      const { uri } = await VideoThumbnails.getThumbnailAsync(localUri, {
        time: 1000,
        quality: 0.6,
      });
      setThumbState(videoId, { uri, error: false, loading: false });
    } catch (e) {
      console.warn(`[Thumbnail] failed for ${videoId}:`, e);
      setThumbState(videoId, { uri: null, error: true, loading: false });
    } finally {
      thumbInFlight.delete(videoId);
    }
  })();

  thumbInFlight.set(videoId, promise);
}

function useThumb(videoId: string, source: number): ThumbState {
  const [state, setState] = useState<ThumbState>(() => getThumbState(videoId));

  useEffect(() => {
    setState(getThumbState(videoId));
    const unsub = subscribeThumb(videoId, setState);
    loadThumbnail(videoId, source);
    return unsub;
  }, [videoId]);

  return state;
}

// ─── Theme tokens ─────────────────────────────────────────────────────────────
const THEMES = {
  dark: {
    bg: '#0D0D0D', chip: '#2A2A2A', pillBg: 'rgba(255,255,255,0.15)',
    pillText: '#FFFFFF', text: '#F5F5F5', subtext: '#888888',
    border: '#2A2A2A', navBg: '#111111', navBorder: '#222222',
    activeTab: '#F5F5F5', activeTabText: '#111111', switchTrackOn: '#AAAAAA',
  },
  light: {
    bg: '#FFFFFF', chip: '#E8E8E8', pillBg: 'rgba(0,0,0,0.55)',
    pillText: '#FFFFFF', text: '#111111', subtext: '#666666',
    border: '#E6E8EB', navBg: '#FFFFFF', navBorder: '#E6E8EB',
    activeTab: '#111111', activeTabText: '#FFFFFF', switchTrackOn: '#555555',
  },
};

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const [theme,        setTheme]        = useState<Theme>('dark');
  const [activeTab,    setActiveTab]    = useState<Tab>('feed');
  const [prevTab,      setPrevTab]      = useState<Tab>('reels');
  const [previewVideo, setPreviewVideo] = useState<(typeof videos)[0] | null>(null);
  const t = THEMES[theme];

  // STEP 2: Removed eager preload of all videos on mount.
  // Thumbnails are loaded on-demand by useThumb when items render in the grid.

  const openSettings  = () => {
    setPrevTab(activeTab === 'settings' ? prevTab : activeTab);
    setActiveTab('settings');
  };
  const closeSettings = () => setActiveTab(prevTab);

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) setActiveTab((c) => c === 'feed'  ? 'reels' : c);
        if (g.dx >  50) setActiveTab((c) => c === 'reels' ? 'feed'  : c);
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.navBg }]}>
      <View
        style={[styles.app, { backgroundColor: t.bg }]}
        {...(activeTab !== 'settings' ? swipePan.panHandlers : {})}
      >
        <View style={[styles.content, activeTab !== 'settings' && styles.contentWithNav]}>
          {activeTab === 'feed'     && <FeedScreen t={t} />}
          {activeTab === 'reels'    && (
            <ReelsScreen t={t} onOpenSettings={openSettings} onPreviewVideo={setPreviewVideo} />
          )}
          {activeTab === 'settings' && (
            <SettingsScreen
              theme={theme} t={t}
              onToggleTheme={() => setTheme((p) => p === 'dark' ? 'light' : 'dark')}
              onBack={closeSettings}
            />
          )}
        </View>
        {activeTab !== 'settings' && (
          <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} t={t} />
        )}
        {previewVideo && (
          <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────
function FeedScreen({ t }: { t: typeof THEMES.dark }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [pausedMap,   setPausedMap]   = useState<Record<number, boolean>>({});
  const [showIconMap, setShowIconMap] = useState<Record<number, boolean>>({});

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        setActiveIndex(idx);
        setPausedMap((prev) => ({ ...prev, [idx]: false }));
      }
    }, [],
  );

  // STEP 4: Preload only next + 1 (two ahead of current)
  useEffect(() => {
    const preloadIndex = activeIndex + 2;
    if (videos[preloadIndex]) {
      resolveAssetUri(
        videos[preloadIndex].id,
        videos[preloadIndex].source,
      ).catch(() => {});
    }
  }, [activeIndex]);

  const togglePlayPause = (index: number) => {
    setPausedMap  ((prev) => ({ ...prev, [index]: !prev[index] }));
    setShowIconMap((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => setShowIconMap((prev) => ({ ...prev, [index]: false })), 700);
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
        // STEP 6: Reduced FlatList workload
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={2}
        removeClippedSubviews={false}
        getItemLayout={(_, index) => ({ length: VIDEO_HEIGHT, offset: VIDEO_HEIGHT * index, index })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index }) => (
          <FeedVideoItem
            item={item}
            index={index}
            activeIndex={activeIndex}
            isActive={index === activeIndex}
            isPaused={!!pausedMap[index]}
            showIcon={!!showIconMap[index]}
            t={t}
            onTogglePlayPause={togglePlayPause}
          />
        )}
      />
    </View>
  );
}

// ─── FeedVideoItem ────────────────────────────────────────────────────────────
type FeedVideoItemProps = {
  item: (typeof videos)[0];
  index: number;
  activeIndex: number;
  isActive: boolean;
  isPaused: boolean;
  showIcon: boolean;
  t: typeof THEMES.dark;
  onTogglePlayPause: (i: number) => void;
};

function FeedVideoItem({ item, index, activeIndex, isActive, isPaused, showIcon, t, onTogglePlayPause }: FeedVideoItemProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(
    assetUriCache[item.id] ?? null,
  );

  // STEP 5: Only render the video player when within 1 of the active index
  const shouldRenderVideo = Math.abs(index - activeIndex) <= 1;

  // Resolve URI when this item is near-active
  useEffect(() => {
    if (!shouldRenderVideo || resolvedUri) return;
    let alive = true;
    resolveAssetUri(item.id, item.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch((e) => { console.warn('[URI]', item.id, e); });
    return () => { alive = false; };
  }, [item.id, shouldRenderVideo]);

  // Thumbnail for fallback when video is not mounted
  const { uri: thumbUri } = useThumb(item.id, item.source);

  return (
    <View style={styles.videoPage}>
      {shouldRenderVideo && resolvedUri ? (
        // STEP 1: expo-video player
        <ExpoVideoPlayer
          uri={resolvedUri}
          isActive={isActive}
          isPaused={isPaused}
        />
      ) : (
        // STEP 5: Show thumbnail when outside the ±1 window
        <View style={styles.videoPlaceholder}>
          {thumbUri ? (
            <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          ) : (
            <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" />
          )}
        </View>
      )}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapOverlay}
        onPress={() => onTogglePlayPause(index)}
      >
        {showIcon && (
          <View style={styles.playPauseIconWrap}>
            <Ionicons name={isPaused ? 'play' : 'pause'} size={52} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>
      <View style={styles.videoMeta}>
        <Text style={styles.videoTitle}>{item.title}</Text>
        <View style={styles.tagPillRow}>
          {item.tags.slice(0, 3).map((tag) => (
            <View key={tag} style={styles.tagPill}>
              <Text style={styles.tagPillText}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.feedActions}>
        <GlassIconButton icon="heart"            label="Like"  size={52} onPress={() => {}} />
        <GlassIconButton icon="bookmark-outline" label="Save"  size={52} onPress={() => {}} />
        <GlassIconButton icon="share-social"     label="Share" size={52} onPress={() => {}} />
      </View>
    </View>
  );
}

// ─── ExpoVideoPlayer ──────────────────────────────────────────────────────────
// STEP 1: Wraps expo-video's useVideoPlayer + VideoView
type ExpoVideoPlayerProps = {
  uri: string;
  isActive: boolean;
  isPaused: boolean;
};

function ExpoVideoPlayer({ uri, isActive, isPaused }: ExpoVideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    if (isActive && !isPaused) {
      player.play();
    } else {
      player.pause();
    }
  }, [isActive, isPaused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

// ─── ExpoVideoPlayerModal ─────────────────────────────────────────────────────
type ExpoVideoPlayerModalProps = {
  uri: string;
  paused: boolean;
};

function ExpoVideoPlayerModal({ uri, paused }: ExpoVideoPlayerModalProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });

  useEffect(() => {
    if (paused) {
      player.pause();
    } else {
      player.play();
    }
  }, [paused, player]);

  return (
    <VideoView
      player={player}
      style={StyleSheet.absoluteFillObject}
      contentFit="contain"
      nativeControls={false}
    />
  );
}

// ─── GlassIconButton ──────────────────────────────────────────────────────────
type GlassIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size?: number;
  onPress: () => void;
};
function GlassIconButton({ icon, label, size = 52, onPress }: GlassIconButtonProps) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animIn = () =>
    Animated.parallel([
      Animated.spring(scale,   { toValue: 0.86, useNativeDriver: true, speed: 60, bounciness: 2 }),
      Animated.timing(opacity, { toValue: 0.70, duration: 70,  useNativeDriver: true }),
    ]).start();
  const animOut = () =>
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1,    useNativeDriver: true, speed: 28, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1,    duration: 140, useNativeDriver: true }),
    ]).start();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={animIn}
      onPressOut={animOut}
    >
      <Animated.View
        style={[
          styles.glassButton,
          { width: size, height: size, borderRadius: size / 2 },
          { transform: [{ scale }], opacity },
        ]}
      >
        <Ionicons name={icon} size={Math.round(size * 0.44)} color="#FFFFFF" />
      </Animated.View>
    </Pressable>
  );
}

// ─── ReelsScreen ──────────────────────────────────────────────────────────────
type ReelsScreenProps = {
  t: typeof THEMES.dark;
  onOpenSettings: () => void;
  onPreviewVideo: (v: (typeof videos)[0]) => void;
};

function ReelsScreen({ t, onOpenSettings, onPreviewVideo }: ReelsScreenProps) {
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const allTags = ['All', 'Nature', 'Travel', 'Urban', 'Sports', 'Food'];

  return (
    <View style={[styles.reelsScreen, { backgroundColor: t.bg }]}>
      <View style={[styles.reelsHeader, { paddingTop: STATUS_BAR_HEIGHT + 16 }]}>
        <View style={styles.appLogo} />
        <View style={styles.headerActions}>
          <RoundIconButton icon="search"   label="Search"   size={42} color={t.chip} iconColor={t.text} onPress={() => {}} />
          <RoundIconButton icon="settings" label="Settings" size={42} color={t.chip} iconColor={t.text} onPress={onOpenSettings} />
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.chipScroll}
        contentContainerStyle={styles.chipScrollContent}
      >
        {allTags.map((label) => {
          const isActive = label === selectedTag;
          return (
            <Pressable
              key={label}
              onPress={() => setSelectedTag(label)}
              style={({ pressed }) => [
                styles.tagCard,
                { backgroundColor: isActive ? t.text : t.chip, opacity: pressed ? 0.72 : 1 },
              ]}
            >
              <Text style={[styles.tagText, { color: isActive ? t.bg : t.text }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={buildRows(videos, GRID_COLS)}
        keyExtractor={(_, i) => `row-${i}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.videoGrid}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((video, colIndex) =>
              video ? (
                <GridThumbnailItem key={video.id} video={video} onPress={() => onPreviewVideo(video)} />
              ) : (
                <View key={`empty-${colIndex}`} style={styles.gridItem} />
              ),
            )}
          </View>
        )}
      />
    </View>
  );
}

// ─── GridThumbnailItem ────────────────────────────────────────────────────────
type GridThumbnailItemProps = { video: (typeof videos)[0]; onPress: () => void };

function GridThumbnailItem({ video, onPress }: GridThumbnailItemProps) {
  const { uri: thumbUri, error: thumbError, loading } = useThumb(video.id, video.source);

  return (
    <TouchableOpacity style={styles.gridItem} activeOpacity={0.82} onPress={onPress}>
      {thumbUri && !thumbError ? (
        <Image source={{ uri: thumbUri }} style={styles.gridThumb} resizeMode="cover" />
      ) : (
        <View style={styles.gridThumbPlaceholder}>
          {thumbError
            ? <Ionicons name="videocam-off-outline" size={22} color="rgba(255,255,255,0.3)" />
            : <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
          }
        </View>
      )}
      <View style={styles.gridPlayBadge} pointerEvents="none">
        <Ionicons name="play" size={12} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

function buildRows<T>(arr: T[], cols: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < arr.length; i += cols) {
    const row = arr.slice(i, i + cols) as (T | null)[];
    while (row.length < cols) row.push(null);
    rows.push(row);
  }
  return rows;
}

// ─── VideoPreviewModal ────────────────────────────────────────────────────────
type VideoPreviewModalProps = { video: (typeof videos)[0]; onClose: () => void };

function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const [paused,      setPaused]      = useState(false);
  const [showIcon,    setShowIcon]    = useState(false);
  const [resolvedUri, setResolvedUri] = useState<string | null>(
    assetUriCache[video.id] ?? null,
  );

  useEffect(() => {
    if (resolvedUri) return;
    let alive = true;
    resolveAssetUri(video.id, video.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [video.id]);

  const togglePause = () => {
    setPaused((p) => !p);
    setShowIcon(true);
    setTimeout(() => setShowIcon(false), 700);
  };

  return (
    <Modal visible animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={styles.previewContainer}>
        {!resolvedUri && (
          <View style={styles.videoPlaceholder}>
            <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" />
          </View>
        )}
        {/* STEP 1: expo-video in modal */}
        {resolvedUri && (
          <ExpoVideoPlayerModal uri={resolvedUri} paused={paused} />
        )}
        <TouchableOpacity activeOpacity={1} style={styles.previewTap} onPress={togglePause}>
          {showIcon && (
            <View style={styles.playPauseIconWrap}>
              <Ionicons name={paused ? 'play' : 'pause'} size={52} color="#FFFFFF" />
            </View>
          )}
        </TouchableOpacity>
        <Pressable style={styles.previewClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
        <View style={styles.previewMeta}>
          <Text style={styles.previewTitle}>{video.title}</Text>
          <View style={styles.tagPillRow}>
            {video.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tagPill}>
                <Text style={styles.tagPillText}>{tag}</Text>
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
  theme: Theme; t: typeof THEMES.dark;
  onToggleTheme: () => void; onBack: () => void;
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
              <Text style={[styles.settingDesc,  { color: t.subtext }]}>{theme === 'dark' ? 'On' : 'Off'}</Text>
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
    <View style={[
      styles.bottomTabs,
      { backgroundColor: t.navBg, borderTopColor: t.navBorder, paddingBottom: GESTURE_INSET, height: NAV_HEIGHT + GESTURE_INSET },
    ]}>
      <TabButton icon="home" label="Home"  active={activeTab === 'feed'}  onPress={() => onChangeTab('feed')}  t={t} />
      <TabButton icon="film" label="Reels" active={activeTab === 'reels'} onPress={() => onChangeTab('reels')} t={t} />
    </View>
  );
}

// ─── TabButton ────────────────────────────────────────────────────────────────
type TabButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; active: boolean;
  onPress: () => void; t: typeof THEMES.dark;
};
function TabButton({ icon, label, active, onPress, t }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.tabButton, active && styles.tabButtonActive, pressed && { opacity: 0.72 }]}
    >
      <Ionicons name={icon} size={25} color={active ? t.activeTab : t.subtext} />
      <Text style={[styles.tabLabel, { color: active ? t.activeTab : t.subtext, fontWeight: active ? '700' : '400' }]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ─── RoundIconButton ──────────────────────────────────────────────────────────
type RoundIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string; color: string; iconColor: string; size?: number; onPress: () => void;
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
        pressed && { opacity: 0.72, transform: [{ scale: 0.95 }] },
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={iconColor} />
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea:       { flex: 1 },
  app:            { flex: 1 },
  content:        { flex: 1 },
  contentWithNav: { paddingBottom: NAV_HEIGHT + GESTURE_INSET },

  feedScreen: { flex: 1, backgroundColor: '#000000' },
  videoPage:  { height: VIDEO_HEIGHT, backgroundColor: '#000000' },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A0A0A',
    gap: 12,
  },
  videoErrorText: { color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600' },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 72,
  },
  playPauseIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius: 50,
    padding: 16,
  },
  videoMeta: {
    position: 'absolute',
    left: 18,
    right: 84,
    bottom: 64,
    gap: 8,
  },
  videoTitle:  { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  tagPillRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: {
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.30)',
  },
  tagPillText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF', letterSpacing: 0.2 },
  feedActions: { position: 'absolute', right: 16, bottom: 64, gap: 16, alignItems: 'center' },
  glassButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.30)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 5,
  },

  reelsScreen:       { flex: 1 },
  reelsHeader:       { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingBottom: 4 },
  appLogo:           { width: 120, height: 36 },
  headerActions:     { flexDirection: 'row', gap: 10 },
  chipScroll:        { marginTop: 14, flexGrow: 0, flexShrink: 0 },
  chipScrollContent: { paddingHorizontal: 18, gap: 8, paddingVertical: 4, alignItems: 'center' },
  tagCard:           { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 9, justifyContent: 'center', alignItems: 'center' },
  tagText:           { fontSize: 14, fontWeight: '700' },
  videoGrid:         { paddingTop: 14, paddingBottom: 24 },
  gridRow:           { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  gridItem:          { width: GRID_ITEM_WIDTH, height: GRID_ITEM_HEIGHT, borderRadius: 4, overflow: 'hidden', backgroundColor: '#1A1A1A' },
  gridThumb:            { width: '100%', height: '100%' },
  gridThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1A1A' },
  gridPlayBadge:        { position: 'absolute', top: 6, right: 6, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 8, padding: 3 },

  previewContainer: { flex: 1, backgroundColor: '#000000' },
  previewTap:       { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  previewClose:     { position: 'absolute', top: STATUS_BAR_HEIGHT + 16, left: 16, backgroundColor: 'rgba(0,0,0,0.50)', borderRadius: 20, padding: 8 },
  previewMeta:      { position: 'absolute', left: 18, right: 18, bottom: 60, gap: 8 },
  previewTitle:     { color: '#FFFFFF', fontSize: 18, fontWeight: '800' },

  settingsScreen:   { flex: 1, paddingHorizontal: 18 },
  settingsHeader:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 },
  settingsTitle:    { fontSize: 20, fontWeight: '800' },
  backButton:       { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  settingSection:   { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingRow:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 18, borderBottomWidth: 1 },
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  settingLabel:     { fontSize: 16, fontWeight: '700' },
  settingDesc:      { fontSize: 13, marginTop: 2 },

  bottomTabs:      { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10 },
  tabButton:       { alignItems: 'center', justifyContent: 'center', borderRadius: 16, height: 52, width: 76, gap: 3 },
  tabButtonActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  tabLabel:        { fontSize: 10, letterSpacing: 0.3 },

  roundIconButton: { alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.14, shadowRadius: 8, elevation: 5 },
});
