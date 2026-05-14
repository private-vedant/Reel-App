import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
  Share,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────
type Tab   = 'feed' | 'reels' | 'settings';
type Theme = 'dark' | 'light';

// ─── Layout constants ─────────────────────────────────────────────────────────
const NAV_HEIGHT        = 76;
const GESTURE_INSET     = Platform.OS === 'android' ? 24 : 0;
const STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIDEO_HEIGHT    = SCREEN_HEIGHT - NAV_HEIGHT - GESTURE_INSET;
const GRID_GAP        = 3;
const GRID_COLS       = 3;
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH / 0.72;

// Reel seek bar — edge-to-edge, grey played / black remainder (feed only when `showSeekBar`)
const SEEK_BAR_HEIGHT    = 5;
const SEEK_BAR_ACTIVE_H  = 7;
const SEEK_POLL_MS       = 90;
const SEEK_PREVIEW_W     = 108;
const SEEK_PREVIEW_H     = 192;
const SEEK_PREVIEW_DEBOUNCE_MS = 100;
const SCRUB_THUMB_CACHE_MAX = 40;

const scrubThumbCacheKeys: string[] = [];
const scrubThumbCache = new Map<string, string>();

function rememberScrubThumb(key: string, thumbUri: string) {
  if (!scrubThumbCache.has(key)) {
    scrubThumbCacheKeys.push(key);
    while (scrubThumbCacheKeys.length > SCRUB_THUMB_CACHE_MAX) {
      const evict = scrubThumbCacheKeys.shift()!;
      scrubThumbCache.delete(evict);
    }
  }
  scrubThumbCache.set(key, thumbUri);
}


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
  { id: 'video-13', title: 'Video 13', tags: ['Clips', 'Moments'],               source: require('../../assets/videos/VID_20260224_211203_828.mp4') },
  { id: 'video-14', title: 'Video 14', tags: ['Clips', 'Street'],                source: require('../../assets/videos/VID_20260224_211633_035.mp4') },
  { id: 'video-15', title: 'Video 15', tags: ['Travel', 'Day'],                 source: require('../../assets/videos/VID_20260224_211956_867.mp4') },
  { id: 'video-16', title: 'Video 16', tags: ['Urban', 'Night'],                source: require('../../assets/videos/VID_20260224_212038_004.mp4') },
  { id: 'video-17', title: 'Video 17', tags: ['Lifestyle', 'B-roll'],            source: require('../../assets/videos/VID_20260224_213537_860.mp4') },
  { id: 'video-18', title: 'Video 18', tags: ['Nature', 'Slow'],                 source: require('../../assets/videos/VID_20260224_213639_615.mp4') },
  { id: 'video-19', title: 'Video 19', tags: ['Sports', 'Motion'],              source: require('../../assets/videos/VID_20260224_215255_051.mp4') },
  { id: 'video-20', title: 'Video 20', tags: ['Music', 'Vibe'],                 source: require('../../assets/videos/VID_20260224_220159_704.mp4') },
  { id: 'video-21', title: 'Video 21', tags: ['Spring', 'Outdoor'],             source: require('../../assets/videos/VID_20260416_200910_873.mp4') },
  { id: 'video-22', title: 'Video 22', tags: ['City', 'Golden hour'],           source: require('../../assets/videos/VID_20260416_201053_575.mp4') },
  { id: 'video-23', title: 'Video 23', tags: ['Walk', 'Cinematic'],            source: require('../../assets/videos/VID_20260416_201127_758.mp4') },
  { id: 'video-24', title: 'Video 24', tags: ['Morning', 'Light'],              source: require('../../assets/videos/VID_20260417_094053_695.mp4') },
  { id: 'video-25', title: 'Video 25', tags: ['Details', 'Macro'],             source: require('../../assets/videos/VID_20260417_095712_899.mp4') },
  { id: 'video-26', title: 'Video 26', tags: ['Sky', 'Clouds'],                 source: require('../../assets/videos/VID_20260417_095941_753.mp4') },
  { id: 'video-27', title: 'Video 27', tags: ['Quiet', 'Mood'],                  source: require('../../assets/videos/VID_20260417_100008_614.mp4') },
  { id: 'video-28', title: 'Video 28', tags: ['Sunset', 'Silhouette'],          source: require('../../assets/videos/VID_20260417_100107_210.mp4') },
  { id: 'video-29', title: 'Video 29', tags: ['Blue hour', 'Urban'],            source: require('../../assets/videos/VID_20260424_074847_189.mp4') },
  { id: 'video-30', title: 'Video 30', tags: ['Night', 'Neon'],                 source: require('../../assets/videos/VID_20260424_212407_790.mp4') },
];

type VideoEntry = (typeof videos)[number];
/** One row of the library grid FlatList (`buildRows` output). */
type LibraryGridRow = (VideoEntry | null)[];

// ─── Asset URI cache ──────────────────────────────────────────────────────────
// Shared across the entire app lifetime — avoids redundant disk reads
const assetUriCache: Partial<Record<string, string>>   = {};
const assetUriPromise: Partial<Record<string, Promise<string>>> = {};

async function resolveAssetUri(videoId: string, source: number): Promise<string> {
  if (assetUriCache[videoId]) return assetUriCache[videoId]!;
  if (assetUriPromise[videoId]) return assetUriPromise[videoId]!;

  const promise = (async () => {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) throw new Error(`Unable to resolve asset URI for ${videoId}`);
    assetUriCache[videoId] = uri;
    return uri;
  })().finally(() => { delete assetUriPromise[videoId]; });

  assetUriPromise[videoId] = promise;
  return promise;
}

// ─── Thumbnail store ──────────────────────────────────────────────────────────
// Module-level singleton so thumbnails survive tab switches without re-fetching
type ThumbState = { uri: string | null; error: boolean; loading: boolean };

const thumbStore: Map<string, ThumbState>                        = new Map();
const thumbListeners: Map<string, Set<(s: ThumbState) => void>>  = new Map();
const thumbInFlight: Map<string, Promise<void>>                   = new Map();

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

// ─── Preserved app state (module-level singleton) ─────────────────────────────
// Survives tab switches without triggering re-renders
const preserved = {
  // Feed tab
  feedIndex:        0,
  feedTimestamp:    0,   // seconds

  // Library (Reels) tab scroll
  libraryScrollY:   0,   // pixels from top of FlatList
};

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
  const t = THEMES[theme];

  const openSettings = () => {
    setPrevTab(activeTab === 'settings' ? prevTab : activeTab);
    setActiveTab('settings');
  };
  const closeSettings = () => setActiveTab(prevTab);

  // Horizontal swipe to switch between feed ↔ reels
  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 20 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_, g) => {
        if (g.dx < -50) setActiveTab((c) => (c === 'feed'  ? 'reels' : c));
        if (g.dx >  50) setActiveTab((c) => (c === 'reels' ? 'feed'  : c));
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.navBg }]}>
      <View
        style={[styles.app, { backgroundColor: t.bg }]}
        {...(activeTab !== 'settings' ? swipePan.panHandlers : {})}
      >
        <View style={styles.content}>
          {/*
           * FeedScreen: always mounted (display:none when inactive) so its internal
           * state (scroll position, active index, player timestamps) is preserved
           * without any manual serialisation.
           */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { display: activeTab === 'feed' ? 'flex' : 'none' },
            ]}
          >
            <FeedScreen t={t} isVisible={activeTab === 'feed'} />
          </View>

          {/*
           * ReelsScreen: also always mounted (display:none when inactive) so the
           * library grid scroll position is preserved automatically.
           */}
          <View
            style={[
              StyleSheet.absoluteFill,
              { display: activeTab === 'reels' ? 'flex' : 'none' },
            ]}
          >
            <ReelsScreen t={t} onOpenSettings={openSettings} />
          </View>

          {activeTab === 'settings' && (
            <SettingsScreen
              theme={theme}
              t={t}
              onToggleTheme={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))}
              onBack={closeSettings}
            />
          )}
        </View>

        {activeTab !== 'settings' && (
          <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} t={t} />
        )}
      </View>
    </SafeAreaView>
  );
}

// ─── FeedScreen ───────────────────────────────────────────────────────────────
/**
 * Vertical-swipe reel player (Home tab).
 * Preserves active index + playback timestamp in the module-level `preserved`
 * object so restoring state is instant and flicker-free.
 */
function FeedScreen({
  t,
  isVisible,
}: {
  t: typeof THEMES.dark;
  isVisible: boolean;
}) {
  const [activeIndex, setActiveIndex] = useState(preserved.feedIndex);
  const [pausedMap,   setPausedMap]   = useState<Record<number, boolean>>({});
  const [showIconMap, setShowIconMap] = useState<Record<number, boolean>>({});
  const flatListRef = useRef<FlatList>(null);

  // Restore scroll position each time this tab becomes visible
  useEffect(() => {
    if (isVisible && flatListRef.current && preserved.feedIndex > 0) {
      flatListRef.current.scrollToIndex({
        index: preserved.feedIndex,
        animated: false,
      });
    }
  }, [isVisible]);

  // Preload the video two positions ahead to avoid buffering gaps
  useEffect(() => {
    const next = activeIndex + 2;
    if (videos[next]) {
      resolveAssetUri(videos[next].id, videos[next].source).catch(() => {});
    }
  }, [activeIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        setActiveIndex(idx);
        preserved.feedIndex = idx;
        // Auto-play newly visible item
        setPausedMap((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [],
  );

  const togglePlayPause = (index: number) => {
    setPausedMap  ((prev) => ({ ...prev, [index]: !prev[index] }));
    setShowIconMap((prev) => ({ ...prev, [index]: true }));
    setTimeout(
      () => setShowIconMap((prev) => ({ ...prev, [index]: false })),
      700,
    );
  };

  return (
    <View style={styles.feedScreen}>
      <FlatList
        ref={flatListRef}
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={VIDEO_HEIGHT}
        snapToAlignment="start"
        decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.92}
        disableIntervalMomentum
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={false}
        initialScrollIndex={preserved.feedIndex}
        getItemLayout={(_, index) => ({
          length: VIDEO_HEIGHT,
          offset: VIDEO_HEIGHT * index,
          index,
        })}
        viewabilityConfig={viewabilityConfig}
        onViewableItemsChanged={onViewableItemsChanged}
        renderItem={({ item, index }) => (
          <FeedVideoItem
            item={item}
            index={index}
            activeIndex={activeIndex}
            isActive={index === activeIndex && isVisible}
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

function FeedVideoItem({
  item,
  index,
  activeIndex,
  isActive,
  isPaused,
  showIcon,
  t,
  onTogglePlayPause,
}: FeedVideoItemProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(
    assetUriCache[item.id] ?? null,
  );

  // Only render the actual VideoView for the active item ± 1 neighbour
  const shouldRenderVideo = Math.abs(index - activeIndex) <= 1;

  useEffect(() => {
    if (!shouldRenderVideo || resolvedUri) return;
    let alive = true;
    resolveAssetUri(item.id, item.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch((e) => { console.warn('[URI]', item.id, e); });
    return () => { alive = false; };
  }, [item.id, shouldRenderVideo]);

  const { uri: thumbUri } = useThumb(item.id, item.source);

  const handleShare = useCallback(async () => {
    await shareVideo(item, thumbUri ?? undefined);
  }, [item, thumbUri]);

  const onTimestampChange = useCallback(
    (ts: number) => {
      if (isActive) preserved.feedTimestamp = ts;
    },
    [isActive],
  );

  return (
    <View style={styles.videoPage}>
      {shouldRenderVideo && resolvedUri ? (
        <ExpoVideoPlayer
          videoId={item.id}
          uri={resolvedUri}
          isActive={isActive}
          isPaused={isPaused}
          initialTimestamp={
            // Restore saved timestamp only for the initially active item
            isActive && index === preserved.feedIndex
              ? preserved.feedTimestamp
              : 0
          }
          onTimestampChange={onTimestampChange}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" />
          )}
        </View>
      )}

      {/* Full-screen tap overlay — play / pause toggle */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapOverlay}
        onPress={() => onTogglePlayPause(index)}
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

      {/* Reel metadata overlay */}
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

      {/* Action buttons */}
      <View style={styles.feedActions}>
        <GlassIconButton icon="heart"            label="Like"  size={52} onPress={() => {}} />
        <GlassIconButton icon="bookmark-outline" label="Save"  size={52} onPress={() => {}} />
        <GlassIconButton icon="share-social"     label="Share" size={52} onPress={handleShare} />
      </View>
    </View>
  );
}

// ─── ExpoVideoPlayer ──────────────────────────────────────────────────────────
/**
 * Reel player: optional edge-to-edge seek UI (`showSeekBar`), throttled scrub
 * thumbnails, stable PanResponder via refs, and light playback polling.
 */
type ExpoVideoPlayerProps = {
  videoId: string;
  uri: string;
  isActive: boolean;
  isPaused: boolean;
  initialTimestamp?: number;
  onTimestampChange?: (seconds: number) => void;
  /** When false, hides the seek bar (e.g. library full-screen preview). Default true. */
  showSeekBar?: boolean;
};

function ExpoVideoPlayer({
  videoId,
  uri,
  isActive,
  isPaused,
  initialTimestamp = 0,
  onTimestampChange,
  showSeekBar = true,
}: ExpoVideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop  = true;
    p.muted = false;
    if (initialTimestamp > 0) {
      p.currentTime = initialTimestamp;
    }
  });

  const [duration,    setDuration]    = useState(0);
  const [currentTime, setCurrentTime] = useState(initialTimestamp);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubRatio,  setScrubRatio]  = useState(0);
  const [seekBarActive, setSeekBarActive] = useState(false);
  const [scrubPreviewUri, setScrubPreviewUri] = useState<string | null>(null);

  const seekBarWidthRef = useRef(SCREEN_WIDTH);
  const lastScrubRatioRef = useRef(0);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewGenRef   = useRef(0);
  const resumeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [seekLayoutW, setSeekLayoutW] = useState(0);

  const panStateRef = useRef({
    player,
    duration: 0,
    isActive,
    isPaused,
    onTimestampChange,
  });
  panStateRef.current = {
    player,
    duration,
    isActive,
    isPaused,
    onTimestampChange,
  };

  const scrubRatioFromLocation = (locationX: number) => {
    const w = seekBarWidthRef.current;
    if (w <= 0) return 0;
    const r = clamp(locationX / w, 0, 1);
    lastScrubRatioRef.current = r;
    return r;
  };

  // ── Poll playback position (seek UI and/or timestamp callback) ──
  useEffect(() => {
    const needsPoll =
      showSeekBar || typeof onTimestampChange === 'function';
    const shouldPoll =
      needsPoll && isActive && !isPaused && !isScrubbing;

    if (shouldPoll) {
      pollIntervalRef.current = setInterval(() => {
        try {
          const ct = player.currentTime ?? 0;
          const du = player.duration   ?? 0;
          setCurrentTime(ct);
          if (du > 0) setDuration(du);
          onTimestampChange?.(ct);
        } catch {
          // player may be in a transitional state — skip tick
        }
      }, SEEK_POLL_MS);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [
    isActive,
    isPaused,
    isScrubbing,
    showSeekBar,
    onTimestampChange,
    player,
  ]);

  // ── Play / pause control ──
  useEffect(() => {
    if (isActive && !isPaused) player.play();
    else                       player.pause();
  }, [isActive, isPaused, player]);

  // ── Throttled scrub preview (expo-video-thumbnails) ──
  useEffect(() => {
    if (!showSeekBar || !isScrubbing || duration <= 0) {
      setScrubPreviewUri(null);
      return;
    }

    const tSec = scrubRatio * duration;
    const cacheKey = `${videoId}|${Math.round(tSec * 10)}`;
    const cached = scrubThumbCache.get(cacheKey);
    if (cached) {
      setScrubPreviewUri(cached);
      return;
    }

    const myGen = ++previewGenRef.current;
    const handle = setTimeout(async () => {
      if (previewGenRef.current !== myGen) return;
      const tMs = Math.min(
        Math.max(Math.floor(tSec * 1000), 0),
        Math.max(Math.floor(duration * 1000) - 1, 0),
      );
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time:    tMs,
          quality: 0.38,
        });
        if (previewGenRef.current !== myGen) return;
        rememberScrubThumb(cacheKey, thumbUri);
        setScrubPreviewUri(thumbUri);
      } catch {
        if (previewGenRef.current === myGen) setScrubPreviewUri(null);
      }
    }, SEEK_PREVIEW_DEBOUNCE_MS);

    return () => clearTimeout(handle);
  }, [showSeekBar, isScrubbing, scrubRatio, duration, uri, videoId]);

  useEffect(() => {
    if (!isScrubbing) {
      previewGenRef.current += 1;
      setScrubPreviewUri(null);
    }
  }, [isScrubbing]);

  useEffect(
    () => () => {
      if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current);
    },
    [],
  );

  const seekBarPan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder:      () => true,
        onMoveShouldSetPanResponder:       () => true,
        onPanResponderTerminationRequest: () => true,

        onPanResponderGrant: (evt) => {
          if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
          const { player: pl } = panStateRef.current;
          setIsScrubbing(true);
          setSeekBarActive(true);
          pl.pause();
          const ratio = scrubRatioFromLocation(evt.nativeEvent.locationX);
          setScrubRatio(ratio);
        },

        onPanResponderMove: (evt) => {
          const ratio = scrubRatioFromLocation(evt.nativeEvent.locationX);
          setScrubRatio(ratio);
        },

        onPanResponderRelease: (evt) => {
          const ratio = scrubRatioFromLocation(evt.nativeEvent.locationX);
          setScrubRatio(ratio);

          const { player: pl, duration: dur, isActive: act, isPaused: paused, onTimestampChange: onTs } =
            panStateRef.current;

          if (dur > 0) {
            const seekTo = ratio * dur;
            pl.currentTime = seekTo;
            setCurrentTime(seekTo);
            onTs?.(seekTo);
          }

          resumeTimerRef.current = setTimeout(() => {
            resumeTimerRef.current = null;
            if (act && !paused) pl.play();
            setIsScrubbing(false);
            setSeekBarActive(false);
          }, 120);
        },

        onPanResponderTerminate: () => {
          if (resumeTimerRef.current) {
            clearTimeout(resumeTimerRef.current);
            resumeTimerRef.current = null;
          }
          const ratio = lastScrubRatioRef.current;
          const { player: pl, duration: dur, isActive: act, isPaused: paused, onTimestampChange: onTs } =
            panStateRef.current;
          if (dur > 0) {
            const seekTo = ratio * dur;
            pl.currentTime = seekTo;
            setCurrentTime(seekTo);
            onTs?.(seekTo);
          }
          setIsScrubbing(false);
          setSeekBarActive(false);
          if (act && !paused) pl.play();
        },
      }),
    [],
  );

  const progress = isScrubbing
    ? scrubRatio
    : duration > 0
      ? clamp(currentTime / duration, 0, 1)
      : 0;

  const previewLeft = useMemo(() => {
    const w = seekLayoutW > 0 ? seekLayoutW : seekBarWidthRef.current;
    if (w <= 0) return (SCREEN_WIDTH - SEEK_PREVIEW_W) / 2;
    const x = progress * w - SEEK_PREVIEW_W / 2;
    return clamp(x, 0, Math.max(0, w - SEEK_PREVIEW_W));
  }, [progress, seekLayoutW]);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <VideoView
        player={player}
        style={StyleSheet.absoluteFillObject}
        contentFit="contain"
        nativeControls={false}
      />

      {showSeekBar && (
        <View
          style={styles.seekContainer}
          pointerEvents="box-none"
          onLayout={(e) => {
            const w = e.nativeEvent.layout.width;
            seekBarWidthRef.current = w > 0 ? w : SCREEN_WIDTH;
            setSeekLayoutW(w);
          }}
        >
          {isScrubbing && scrubPreviewUri ? (
            <View
              style={[
                styles.seekPreviewFloating,
                { left: previewLeft, width: SEEK_PREVIEW_W, height: SEEK_PREVIEW_H },
              ]}
              pointerEvents="none"
            >
              <Image
                source={{ uri: scrubPreviewUri }}
                style={styles.seekPreviewImage}
                resizeMode="cover"
              />
            </View>
          ) : null}

          <View style={styles.seekTrackWrapper} {...seekBarPan.panHandlers}>
            <View
              style={[
                styles.seekTrack,
                {
                  height: seekBarActive ? SEEK_BAR_ACTIVE_H : SEEK_BAR_HEIGHT,
                },
              ]}
            >
              <View
                style={[
                  styles.seekFill,
                  { width: `${Math.min(progress * 100, 100)}%` },
                ]}
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── Share logic ──────────────────────────────────────────────────────────────
/**
 * Native share sheet integration.
 * Priority: expo-sharing (file/media) → RN Share (text fallback)
 * Handles: cancellation, invalid URIs, missing media, native failures.
 */
async function shareVideo(
  video: (typeof videos)[0],
  thumbUri?: string,
) {
  try {
    // Attempt to share the cached thumbnail via expo-sharing (supports iOS/Android)
    const sharingAvailable = await Sharing.isAvailableAsync();
    if (sharingAvailable && thumbUri) {
      await Sharing.shareAsync(thumbUri, {
        mimeType:    'image/jpeg',
        dialogTitle: video.title,
        UTI:         'public.jpeg',
      });
      return;
    }

    // Fallback: RN's built-in Share module (text + optional URL)
    const result = await Share.share(
      {
        title:   video.title,
        message: `Check out "${video.title}" — ${video.tags.join(', ')}`,
        // url field works on iOS; Android ignores it but it's harmless
        url:     thumbUri ?? '',
      },
      {
        dialogTitle: video.title, // Android only
      },
    );

    // Silently ignore user-initiated cancellation
    if (result.action === Share.dismissedAction) return;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);

    // User cancelled share — not an error we need to surface
    if (
      message.includes('User did not share') ||
      message.includes('cancel') ||
      message.includes('dismissed')
    ) {
      return;
    }

    Alert.alert('Share failed', 'Unable to share this reel. Please try again.');
  }
}

// ─── GlassIconButton ──────────────────────────────────────────────────────────
type GlassIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  size?: number;
  onPress: () => void;
};

function GlassIconButton({
  icon,
  label,
  size = 52,
  onPress,
}: GlassIconButtonProps) {
  const scale   = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const animIn = () =>
    Animated.parallel([
      Animated.spring(scale,   { toValue: 0.86, useNativeDriver: true, speed: 60, bounciness: 2 }),
      Animated.timing(opacity, { toValue: 0.70, duration: 70, useNativeDriver: true }),
    ]).start();

  const animOut = () =>
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, speed: 28, bounciness: 10 }),
      Animated.timing(opacity, { toValue: 1, duration: 140, useNativeDriver: true }),
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
/**
 * Library / grid tab.
 * Always mounted (display:none when hidden) so the scroll position is preserved.
 * Tapping a grid item opens a full-screen VideoPreviewModal starting at that video.
 */
type ReelsScreenProps = {
  t: typeof THEMES.dark;
  onOpenSettings: () => void;
};

function ReelsScreen({ t, onOpenSettings }: ReelsScreenProps) {
  const [selectedTag,   setSelectedTag]   = useState<string>('All');
  const [previewVideo,  setPreviewVideo]  = useState<(typeof videos)[0] | null>(null);
  const flatListRef = useRef<FlatList<LibraryGridRow>>(null);

  const allTags = ['All', 'Nature', 'Travel', 'Urban', 'Sports', 'Food'];

  // Restore grid scroll position when the screen remounts or becomes visible
  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      preserved.libraryScrollY = e.nativeEvent.contentOffset.y;
    },
    [],
  );

  // Initialise scroll position from preserved state (after first layout)
  const onListLayout = useCallback(() => {
    if (preserved.libraryScrollY > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({
        offset: preserved.libraryScrollY,
        animated: false,
      });
    }
  }, []);

  return (
    <View style={[styles.reelsScreen, { backgroundColor: t.bg }]}>
      {/* Header */}
      <View style={[styles.reelsHeader, { paddingTop: STATUS_BAR_HEIGHT + 16 }]}>
        <View style={styles.appLogo} />
        <View style={styles.headerActions}>
          <RoundIconButton
            icon="search"
            label="Search"
            size={42}
            color={t.chip}
            iconColor={t.text}
            onPress={() => {}}
          />
          <RoundIconButton
            icon="settings"
            label="Settings"
            size={42}
            color={t.chip}
            iconColor={t.text}
            onPress={onOpenSettings}
          />
        </View>
      </View>

      {/* Tag filter chips */}
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
                {
                  backgroundColor: isActive ? t.text : t.chip,
                  opacity: pressed ? 0.72 : 1,
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  { color: isActive ? t.bg : t.text },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/*
       * Grid — clean and minimal: thumbnails only, no titles / tags / overlays.
       * Scroll position is persisted via `preserved.libraryScrollY`.
       */}
      <FlatList<LibraryGridRow>
        ref={flatListRef}
        style={styles.libraryGridList}
        data={buildRows<VideoEntry>(videos, GRID_COLS)}
        keyExtractor={(_, i) => `row-${i}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.videoGrid}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={7}
        removeClippedSubviews
        onLayout={onListLayout}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        renderItem={({ item: row }) => (
          <View style={styles.gridRow}>
            {row.map((video, colIndex) =>
              video ? (
                <GridThumbnailItem
                  key={video.id}
                  video={video}
                  onPress={() => setPreviewVideo(video)}
                />
              ) : (
                <View key={`empty-${colIndex}`} style={styles.gridItem} />
              ),
            )}
          </View>
        )}
      />

      {/* Full-screen preview modal — opens at the tapped video */}
      {previewVideo && (
        <VideoPreviewModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
        />
      )}
    </View>
  );
}

// ─── GridThumbnailItem ────────────────────────────────────────────────────────
/**
 * Minimal grid cell — thumbnail only, no text / buttons / overlays.
 * A small play badge is the only indicator it's a video.
 */
type GridThumbnailItemProps = {
  video: (typeof videos)[0];
  onPress: () => void;
};

function GridThumbnailItem({ video, onPress }: GridThumbnailItemProps) {
  const { uri: thumbUri, error: thumbError } = useThumb(video.id, video.source);

  return (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.82}
      onPress={onPress}
    >
      {thumbUri && !thumbError ? (
        <Image
          source={{ uri: thumbUri }}
          style={styles.gridThumb}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.gridThumbPlaceholder}>
          {thumbError ? (
            <Ionicons
              name="videocam-off-outline"
              size={22}
              color="rgba(255,255,255,0.3)"
            />
          ) : (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.4)" />
          )}
        </View>
      )}

      {/* Minimal play badge */}
      <View style={styles.gridPlayBadge} pointerEvents="none">
        <Ionicons name="play" size={12} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

// ─── Utility: build FlatList rows ─────────────────────────────────────────────
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
/**
 * Full-screen modal triggered from the library grid.
 * Opens at the tapped video and supports vertical swipe to browse all reels —
 * identical UX to the main feed (Instagram / TikTok style).
 */
type VideoPreviewModalProps = {
  video: (typeof videos)[0];
  onClose: () => void;
};

function VideoPreviewModal({ video, onClose }: VideoPreviewModalProps) {
  const startIndex = Math.max(0, videos.findIndex((v) => v.id === video.id));

  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [pausedMap,   setPausedMap]   = useState<Record<number, boolean>>({});
  const [showIconMap, setShowIconMap] = useState<Record<number, boolean>>({});
  const flatListRef = useRef<FlatList>(null);

  // Preload next video to avoid buffering gaps
  useEffect(() => {
    const next = activeIndex + 2;
    if (videos[next]) {
      resolveAssetUri(videos[next].id, videos[next].source).catch(() => {});
    }
  }, [activeIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        setActiveIndex(idx);
        setPausedMap((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [],
  );

  const togglePlayPause = (index: number) => {
    setPausedMap  ((prev) => ({ ...prev, [index]: !prev[index] }));
    setShowIconMap((prev) => ({ ...prev, [index]: true }));
    setTimeout(
      () => setShowIconMap((prev) => ({ ...prev, [index]: false })),
      700,
    );
  };

  return (
    <Modal
      visible
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.previewContainer}>
        {/* Single reel at `startIndex` — scrolling disabled (library preview). */}
        <FlatList
          ref={flatListRef}
          data={videos}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate={Platform.OS === 'ios' ? 'normal' : 0.92}
          disableIntervalMomentum
          initialNumToRender={1}
          maxToRenderPerBatch={1}
          windowSize={3}
          removeClippedSubviews={false}
          initialScrollIndex={startIndex}
          getItemLayout={(_, index) => ({
            length: SCREEN_HEIGHT,
            offset: SCREEN_HEIGHT * index,
            index,
          })}
          viewabilityConfig={viewabilityConfig}
          onViewableItemsChanged={onViewableItemsChanged}
          renderItem={({ item, index }) => (
            <ModalVideoItem
              item={item}
              index={index}
              activeIndex={activeIndex}
              isActive={index === activeIndex}
              isPaused={!!pausedMap[index]}
              showIcon={!!showIconMap[index]}
              onTogglePlayPause={togglePlayPause}
            />
          )}
        />

        {/* Close button floats above everything */}
        <Pressable style={styles.previewClose} onPress={onClose}>
          <Ionicons name="close" size={28} color="#FFFFFF" />
        </Pressable>
      </View>
    </Modal>
  );
}

// ─── ModalVideoItem ───────────────────────────────────────────────────────────
/**
 * A single full-screen reel inside the library preview modal.
 * Mirrors FeedVideoItem minus the seek bar; actions and play/pause only.
 */
type ModalVideoItemProps = {
  item: (typeof videos)[0];
  index: number;
  activeIndex: number;
  isActive: boolean;
  isPaused: boolean;
  showIcon: boolean;
  onTogglePlayPause: (i: number) => void;
};

function ModalVideoItem({
  item,
  index,
  activeIndex,
  isActive,
  isPaused,
  showIcon,
  onTogglePlayPause,
}: ModalVideoItemProps) {
  const [resolvedUri, setResolvedUri] = useState<string | null>(
    assetUriCache[item.id] ?? null,
  );
  const { uri: thumbUri } = useThumb(item.id, item.source);
  const shouldRenderVideo = Math.abs(index - activeIndex) <= 1;

  useEffect(() => {
    if (!shouldRenderVideo || resolvedUri) return;
    let alive = true;
    resolveAssetUri(item.id, item.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [item.id, shouldRenderVideo]);

  const handleShare = useCallback(async () => {
    await shareVideo(item, thumbUri ?? undefined);
  }, [item, thumbUri]);

  return (
    <View style={[styles.videoPage, { height: SCREEN_HEIGHT }]}>
      {shouldRenderVideo && resolvedUri ? (
        <ExpoVideoPlayer
          videoId={item.id}
          uri={resolvedUri}
          isActive={isActive}
          isPaused={isPaused}
          showSeekBar={false}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          {thumbUri ? (
            <Image
              source={{ uri: thumbUri }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
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
            <Ionicons
              name={isPaused ? 'play' : 'pause'}
              size={52}
              color="#FFFFFF"
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Action buttons only — no titles / tags inside modal */}
      <View style={styles.feedActions}>
        <GlassIconButton icon="heart"            label="Like"  size={52} onPress={() => {}} />
        <GlassIconButton icon="bookmark-outline" label="Save"  size={52} onPress={() => {}} />
        <GlassIconButton icon="share-social"     label="Share" size={52} onPress={handleShare} />
      </View>
    </View>
  );
}

// ─── SettingsScreen ───────────────────────────────────────────────────────────
type SettingsScreenProps = {
  theme: Theme;
  t: typeof THEMES.dark;
  onToggleTheme: () => void;
  onBack: () => void;
};

function SettingsScreen({
  theme,
  t,
  onToggleTheme,
  onBack,
}: SettingsScreenProps) {
  return (
    <View
      style={[
        styles.settingsScreen,
        { backgroundColor: t.bg, paddingTop: STATUS_BAR_HEIGHT + 16 },
      ]}
    >
      <View style={styles.settingsHeader}>
        <Pressable
          onPress={onBack}
          style={({ pressed }) => [
            styles.backButton,
            { backgroundColor: t.chip, opacity: pressed ? 0.6 : 1 },
          ]}
        >
          <Ionicons name="arrow-back" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.settingsTitle, { color: t.text }]}>Settings</Text>
        <View style={styles.backButton} />
      </View>

      <View style={[styles.settingSection, { borderColor: t.border }]}>
        <View style={[styles.settingRow, { borderBottomColor: t.border }]}>
          <View style={styles.settingLabelWrap}>
            <Ionicons
              name="moon"
              size={20}
              color={t.subtext}
              style={{ marginRight: 12 }}
            />
            <View>
              <Text style={[styles.settingLabel, { color: t.text }]}>
                Dark Mode
              </Text>
              <Text style={[styles.settingDesc, { color: t.subtext }]}>
                {theme === 'dark' ? 'On' : 'Off'}
              </Text>
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
type BottomTabsProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
  t: typeof THEMES.dark;
};

function BottomTabs({ activeTab, onChangeTab, t }: BottomTabsProps) {
  return (
    <View
      style={[
        styles.bottomTabs,
        {
          backgroundColor: t.navBg,
          borderTopColor:  t.navBorder,
          paddingBottom:   GESTURE_INSET,
          height:          NAV_HEIGHT + GESTURE_INSET,
        },
      ]}
    >
      <TabButton
        icon="home"
        label="Home"
        active={activeTab === 'feed'}
        onPress={() => onChangeTab('feed')}
        t={t}
      />
      <TabButton
        icon="film"
        label="Reels"
        active={activeTab === 'reels'}
        onPress={() => onChangeTab('reels')}
        t={t}
      />
    </View>
  );
}

// ─── TabButton ────────────────────────────────────────────────────────────────
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
      style={({ pressed }) => [
        styles.tabButton,
        active && styles.tabButtonActive,
        pressed && { opacity: 0.72 },
      ]}
    >
      <Ionicons
        name={icon}
        size={25}
        color={active ? t.activeTab : t.subtext}
      />
      <Text
        style={[
          styles.tabLabel,
          {
            color:      active ? t.activeTab : t.subtext,
            fontWeight: active ? '700' : '400',
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ─── RoundIconButton ──────────────────────────────────────────────────────────
type RoundIconButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
  iconColor: string;
  size?: number;
  onPress: () => void;
};

function RoundIconButton({
  icon,
  label,
  color,
  iconColor,
  size = 52,
  onPress,
}: RoundIconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.roundIconButton,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: color,
        },
        pressed && { opacity: 0.72, transform: [{ scale: 0.95 }] },
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={iconColor} />
    </Pressable>
  );
}

// ─── Utility ──────────────────────────────────────────────────────────────────
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── App shell ──
  safeArea:       { flex: 1 },
  app:            { flex: 1 },
  content: { flex: 1 },

  // ── Feed ──
  feedScreen:       { flex: 1, backgroundColor: '#000000' },
  videoPage:        { height: VIDEO_HEIGHT, backgroundColor: '#000000' },
  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#0A0A0A',
    gap: 12,
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    // Narrow horizontal inset so side swipes don't accidentally trigger play/pause
    marginHorizontal: 72,
  },
  playPauseIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius:    50,
    padding:         16,
  },
  videoMeta: {
    position: 'absolute',
    left:     18,
    right:    84,
    bottom:   80,
    gap:      8,
  },
  videoTitle: { color: '#FFFFFF', fontSize: 17, fontWeight: '800' },
  tagPillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagPill: {
    borderRadius:     20,
    paddingHorizontal: 11,
    paddingVertical:   5,
    backgroundColor:  'rgba(255,255,255,0.14)',
    borderWidth:      StyleSheet.hairlineWidth,
    borderColor:      'rgba(255,255,255,0.30)',
  },
  tagPillText: {
    fontSize:    12,
    fontWeight:  '600',
    color:       '#FFFFFF',
    letterSpacing: 0.2,
  },
  feedActions: {
    position:   'absolute',
    right:      16,
    bottom:     80,
    gap:        16,
    alignItems: 'center',
  },
  glassButton: {
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.30)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.30,
    shadowRadius:    8,
    elevation:       5,
  },

  // ── Reel seek stack (feed): edge-to-edge bar, grey played / black remainder ──
  seekContainer: {
    position:       'absolute',
    left:           0,
    right:          0,
    bottom:         0,
    paddingBottom:  2,
    justifyContent: 'flex-end',
  },
  seekPreviewFloating: {
    position:        'absolute',
    bottom:          44,
    borderRadius:    8,
    overflow:        'hidden',
    backgroundColor: '#111111',
    borderWidth:     StyleSheet.hairlineWidth,
    borderColor:     'rgba(255,255,255,0.28)',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.45,
    shadowRadius:    8,
    elevation:       8,
  },
  seekPreviewImage: {
    width:  '100%',
    height: '100%',
  },
  seekTrackWrapper: {
    height:         40,
    justifyContent: 'center',
    width:          '100%',
  },
  seekTrack: {
    width:           '100%',
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius:    2,
    overflow:        'hidden',
  },
  seekFill: {
    height:          '100%',
    backgroundColor: 'rgba(200,200,206,0.62)',
    borderRadius:    2,
  },

  // ── Reels / library screen ──
  reelsScreen:       { flex: 1 },
  reelsHeader:       {
    alignItems:      'center',
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingHorizontal: 18,
    paddingBottom:   4,
  },
  appLogo:           { width: 120, height: 36 },
  headerActions:     { flexDirection: 'row', gap: 10 },
  chipScroll:        { marginTop: 14, flexGrow: 0, flexShrink: 0 },
  chipScrollContent: {
    paddingHorizontal: 18,
    gap:             8,
    paddingVertical: 4,
    alignItems:      'center',
  },
  tagCard: {
    borderRadius:     20,
    paddingHorizontal: 16,
    paddingVertical:  9,
    justifyContent:  'center',
    alignItems:      'center',
  },
  tagText: { fontSize: 14, fontWeight: '700' },

  // Grid — clean cells, thumbnails only (`flex:1` so the list scrolls in the
  // space above BottomTabs; tabs are in layout flow, not overlaid.)
  libraryGridList:      { flex: 1 },
  videoGrid:            { paddingTop: 14, paddingBottom: 24 },
  gridRow:              { flexDirection: 'row', gap: GRID_GAP, marginBottom: GRID_GAP },
  gridItem:             {
    width:           GRID_ITEM_WIDTH,
    height:          GRID_ITEM_HEIGHT,
    borderRadius:    4,
    overflow:        'hidden',
    backgroundColor: '#1A1A1A',
  },
  gridThumb:            { width: '100%', height: '100%' },
  gridThumbPlaceholder: {
    width:           '100%',
    height:          '100%',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1A1A1A',
  },
  // Minimal play badge — the only indicator it's a video
  gridPlayBadge: {
    position:        'absolute',
    top:             6,
    right:           6,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius:    8,
    padding:         3,
  },

  // ── Preview modal ──
  previewContainer: { flex: 1, backgroundColor: '#000000' },
  previewClose: {
    position:        'absolute',
    top:             STATUS_BAR_HEIGHT + 16,
    left:            16,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius:    20,
    padding:         8,
    zIndex:          100,
  },

  // ── Settings ──
  settingsScreen:   { flex: 1, paddingHorizontal: 18 },
  settingsHeader:   {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   32,
  },
  settingsTitle:    { fontSize: 20, fontWeight: '800' },
  backButton:       {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
  },
  settingSection:   { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  settingRow:       {
    flexDirection:    'row',
    alignItems:       'center',
    justifyContent:   'space-between',
    paddingHorizontal: 16,
    paddingVertical:  18,
    borderBottomWidth: 1,
  },
  settingLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  settingLabel:     { fontSize: 16, fontWeight: '700' },
  settingDesc:      { fontSize: 13, marginTop: 2 },

  // ── Bottom nav ──
  bottomTabs: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-around',
    paddingTop:     10,
  },
  tabButton:       {
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   16,
    height:         52,
    width:          76,
    gap:            3,
  },
  tabButtonActive: { backgroundColor: 'rgba(255,255,255,0.10)' },
  tabLabel:        { fontSize: 10, letterSpacing: 0.3 },

  // ── Round icon button (header) ──
  roundIconButton: {
    alignItems:     'center',
    justifyContent: 'center',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.14,
    shadowRadius:   8,
    elevation:      5,
  },
});
