
import { Ionicons } from '@expo/vector-icons';
import { Asset } from 'expo-asset';
import * as Sharing from 'expo-sharing';
import { VideoView, useVideoPlayer } from 'expo-video';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
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
  TextInput,
  TouchableOpacity,
  View,
  ViewToken,
} from 'react-native';


// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Tab   = 'feed' | 'reels' | 'settings';
type Theme = 'dark' | 'light';


// ─────────────────────────────────────────────────────────────────────────────
// Layout constants
// ─────────────────────────────────────────────────────────────────────────────

const NAV_HEIGHT        = 76;
const GESTURE_INSET     = Platform.OS === 'android' ? 24 : 0;
const STATUS_BAR_HEIGHT = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 24) : 0;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const VIDEO_HEIGHT     = SCREEN_HEIGHT - NAV_HEIGHT - GESTURE_INSET;
const GRID_GAP         = 3;
const GRID_COLS        = 3;
const GRID_ITEM_WIDTH  = (SCREEN_WIDTH - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;
const GRID_ITEM_HEIGHT = GRID_ITEM_WIDTH / 0.72;

const PEEK_CARD_W = SCREEN_WIDTH * 0.80;
const PEEK_CARD_H = PEEK_CARD_W / 0.60;
const PEEK_BAR_H  = 50;


// ─────────────────────────────────────────────────────────────────────────────
// Seek-bar / scrub constants
// ─────────────────────────────────────────────────────────────────────────────

const SEEK_BAR_HEIGHT          = 5;
const SEEK_BAR_ACTIVE_H        = 7;
const SEEK_POLL_MS             = 90;
const SEEK_PREVIEW_W           = 108;
const SEEK_PREVIEW_H           = 192;
const SEEK_PREVIEW_DEBOUNCE_MS = 100;
const SCRUB_THUMB_CACHE_MAX    = 40;


// ─────────────────────────────────────────────────────────────────────────────
// Scrub-thumbnail LRU cache
// ─────────────────────────────────────────────────────────────────────────────

const scrubThumbCacheKeys: string[]   = [];
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


// ─────────────────────────────────────────────────────────────────────────────
// Video catalogue
// ─────────────────────────────────────────────────────────────────────────────

const videos = [
  { id: 'video-1',  title: 'Video 1',  tags: ['Nature', 'Aerial', 'Cinematic'], source: require('../../assets/videos/VID_20260425_032402_349.mp4') },
  { id: 'video-2',  title: 'Video 2',  tags: ['Travel', 'Sunset'],              source: require('../../assets/videos/VID_20260304_223952_738.mp4') },
  { id: 'video-3',  title: 'Video 3',  tags: ['Urban', 'Street', 'Night'],      source: require('../../assets/videos/VID_20260214_190958_137.mp4') },
  { id: 'video-4',  title: 'Video 4',  tags: ['Lifestyle'],                     source: require('../../assets/videos/VID_20260210_023909_596.mp4') },
  { id: 'video-5',  title: 'Video 5',  tags: ['Sports', 'Action'],              source: require('../../assets/videos/VID_20260210_022238_888.mp4') },
  { id: 'video-6',  title: 'Video 6',  tags: ['Food', 'Cooking', 'Recipe'],     source: require('../../assets/videos/VID_20260210_021721_055.mp4') },
  { id: 'video-7',  title: 'Video 7',  tags: ['Music', 'Live'],                 source: require('../../assets/videos/VID_20260210_021318_411.mp4') },
  { id: 'video-8',  title: 'Video 8',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260210_021253_958.mp4') },
  { id: 'video-9',  title: 'Video 9',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_002548_856.mp4') },
  { id: 'video-10', title: 'Video 10', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090040_811.mp4') },
  { id: 'video-11', title: 'Video 11', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_003727_347.mp4') },
  { id: 'video-12', title: 'Video 12', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090208_250.mp4') },
  { id: 'video-13', title: 'Video 13', tags: ['Clips', 'Moments'],              source: require('../../assets/videos/VID_20260224_211203_828.mp4') },
  { id: 'video-14', title: 'Video 14', tags: ['Clips', 'Street'],               source: require('../../assets/videos/VID_20260224_211633_035.mp4') },
  { id: 'video-15', title: 'Video 15', tags: ['Travel', 'Day'],                 source: require('../../assets/videos/VID_20260224_211956_867.mp4') },
  { id: 'video-16', title: 'Video 16', tags: ['Urban', 'Night'],                source: require('../../assets/videos/VID_20260224_212038_004.mp4') },
  { id: 'video-17', title: 'Video 17', tags: ['Lifestyle', 'B-roll'],           source: require('../../assets/videos/VID_20260224_213537_860.mp4') },
  { id: 'video-18', title: 'Video 18', tags: ['Nature', 'Slow'],                source: require('../../assets/videos/VID_20260224_213639_615.mp4') },
  { id: 'video-19', title: 'Video 19', tags: ['Sports', 'Motion'],              source: require('../../assets/videos/VID_20260224_215255_051.mp4') },
  { id: 'video-20', title: 'Video 20', tags: ['Music', 'Vibe'],                 source: require('../../assets/videos/VID_20260224_220159_704.mp4') },
  { id: 'video-21', title: 'Video 21', tags: ['Spring', 'Outdoor'],             source: require('../../assets/videos/VID_20260416_200910_873.mp4') },
  { id: 'video-22', title: 'Video 22', tags: ['City', 'Golden hour'],           source: require('../../assets/videos/VID_20260416_201053_575.mp4') },
  { id: 'video-23', title: 'Video 23', tags: ['Walk', 'Cinematic'],             source: require('../../assets/videos/VID_20260416_201127_758.mp4') },
  { id: 'video-24', title: 'Video 24', tags: ['Morning', 'Light'],              source: require('../../assets/videos/VID_20260417_094053_695.mp4') },
  { id: 'video-25', title: 'Video 25', tags: ['Details', 'Macro'],              source: require('../../assets/videos/VID_20260417_095712_899.mp4') },
  { id: 'video-26', title: 'Video 26', tags: ['Sky', 'Clouds'],                 source: require('../../assets/videos/VID_20260417_095941_753.mp4') },
  { id: 'video-27', title: 'Video 27', tags: ['Quiet', 'Mood'],                 source: require('../../assets/videos/VID_20260417_100008_614.mp4') },
  { id: 'video-28', title: 'Video 28', tags: ['Sunset', 'Silhouette'],          source: require('../../assets/videos/VID_20260417_100107_210.mp4') },
  { id: 'video-29', title: 'Video 29', tags: ['Blue hour', 'Urban'],            source: require('../../assets/videos/VID_20260424_074847_189.mp4') },
  { id: 'video-30', title: 'Video 30', tags: ['Night', 'Neon'],                 source: require('../../assets/videos/VID_20260424_212407_790.mp4') },
  { id: 'video-1',  title: 'Video 1',  tags: ['Nature', 'Aerial', 'Cinematic'], source: require('../../assets/videos/VID_20260425_032402_349.mp4') },
  { id: 'video-2',  title: 'Video 2',  tags: ['Travel', 'Sunset'],              source: require('../../assets/videos/VID_20260304_223952_738.mp4') },
  { id: 'video-3',  title: 'Video 3',  tags: ['Urban', 'Street', 'Night'],      source: require('../../assets/videos/VID_20260214_190958_137.mp4') },
  { id: 'video-4',  title: 'Video 4',  tags: ['Lifestyle'],                     source: require('../../assets/videos/VID_20260210_023909_596.mp4') },
  { id: 'video-5',  title: 'Video 5',  tags: ['Sports', 'Action'],              source: require('../../assets/videos/VID_20260210_022238_888.mp4') },
  { id: 'video-6',  title: 'Video 6',  tags: ['Food', 'Cooking', 'Recipe'],     source: require('../../assets/videos/VID_20260210_021721_055.mp4') },
  { id: 'video-7',  title: 'Video 7',  tags: ['Music', 'Live'],                 source: require('../../assets/videos/VID_20260210_021318_411.mp4') },
  { id: 'video-8',  title: 'Video 8',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260210_021253_958.mp4') },
  { id: 'video-9',  title: 'Video 9',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_002548_856.mp4') },
  { id: 'video-10', title: 'Video 10', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090040_811.mp4') },
  { id: 'video-11', title: 'Video 11', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_003727_347.mp4') },
  { id: 'video-12', title: 'Video 12', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090208_250.mp4') },
  { id: 'video-13', title: 'Video 13', tags: ['Clips', 'Moments'],              source: require('../../assets/videos/VID_20260224_211203_828.mp4') },
  { id: 'video-14', title: 'Video 14', tags: ['Clips', 'Street'],               source: require('../../assets/videos/VID_20260224_211633_035.mp4') },
  { id: 'video-15', title: 'Video 15', tags: ['Travel', 'Day'],                 source: require('../../assets/videos/VID_20260224_211956_867.mp4') },
  { id: 'video-16', title: 'Video 16', tags: ['Urban', 'Night'],                source: require('../../assets/videos/VID_20260224_212038_004.mp4') },
  { id: 'video-17', title: 'Video 17', tags: ['Lifestyle', 'B-roll'],           source: require('../../assets/videos/VID_20260224_213537_860.mp4') },
  { id: 'video-18', title: 'Video 18', tags: ['Nature', 'Slow'],                source: require('../../assets/videos/VID_20260224_213639_615.mp4') },
  { id: 'video-19', title: 'Video 19', tags: ['Sports', 'Motion'],              source: require('../../assets/videos/VID_20260224_215255_051.mp4') },
  { id: 'video-20', title: 'Video 20', tags: ['Music', 'Vibe'],                 source: require('../../assets/videos/VID_20260224_220159_704.mp4') },
  { id: 'video-21', title: 'Video 21', tags: ['Spring', 'Outdoor'],             source: require('../../assets/videos/VID_20260416_200910_873.mp4') },
  { id: 'video-22', title: 'Video 22', tags: ['City', 'Golden hour'],           source: require('../../assets/videos/VID_20260416_201053_575.mp4') },
  { id: 'video-23', title: 'Video 23', tags: ['Walk', 'Cinematic'],             source: require('../../assets/videos/VID_20260416_201127_758.mp4') },
  { id: 'video-24', title: 'Video 24', tags: ['Morning', 'Light'],              source: require('../../assets/videos/VID_20260417_094053_695.mp4') },
  { id: 'video-25', title: 'Video 25', tags: ['Details', 'Macro'],              source: require('../../assets/videos/VID_20260417_095712_899.mp4') },
  { id: 'video-26', title: 'Video 26', tags: ['Sky', 'Clouds'],                 source: require('../../assets/videos/VID_20260417_095941_753.mp4') },
  { id: 'video-27', title: 'Video 27', tags: ['Quiet', 'Mood'],                 source: require('../../assets/videos/VID_20260417_100008_614.mp4') },
  { id: 'video-28', title: 'Video 28', tags: ['Sunset', 'Silhouette'],          source: require('../../assets/videos/VID_20260417_100107_210.mp4') },
  { id: 'video-29', title: 'Video 29', tags: ['Blue hour', 'Urban'],            source: require('../../assets/videos/VID_20260424_074847_189.mp4') },
  { id: 'video-30', title: 'Video 30', tags: ['Night', 'Neon'],                 source: require('../../assets/videos/VID_20260424_212407_790.mp4') },
  { id: 'video-1',  title: 'Video 1',  tags: ['Nature', 'Aerial', 'Cinematic'], source: require('../../assets/videos/VID_20260425_032402_349.mp4') },
  { id: 'video-2',  title: 'Video 2',  tags: ['Travel', 'Sunset'],              source: require('../../assets/videos/VID_20260304_223952_738.mp4') },
  { id: 'video-3',  title: 'Video 3',  tags: ['Urban', 'Street', 'Night'],      source: require('../../assets/videos/VID_20260214_190958_137.mp4') },
  { id: 'video-4',  title: 'Video 4',  tags: ['Lifestyle'],                     source: require('../../assets/videos/VID_20260210_023909_596.mp4') },
  { id: 'video-5',  title: 'Video 5',  tags: ['Sports', 'Action'],              source: require('../../assets/videos/VID_20260210_022238_888.mp4') },
  { id: 'video-6',  title: 'Video 6',  tags: ['Food', 'Cooking', 'Recipe'],     source: require('../../assets/videos/VID_20260210_021721_055.mp4') },
  { id: 'video-7',  title: 'Video 7',  tags: ['Music', 'Live'],                 source: require('../../assets/videos/VID_20260210_021318_411.mp4') },
  { id: 'video-8',  title: 'Video 8',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260210_021253_958.mp4') },
  { id: 'video-9',  title: 'Video 9',  tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_002548_856.mp4') },
  { id: 'video-10', title: 'Video 10', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090040_811.mp4') },
  { id: 'video-11', title: 'Video 11', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260219_003727_347.mp4') },
  { id: 'video-12', title: 'Video 12', tags: ['Tech', 'Review'],                source: require('../../assets/videos/VID_20260224_090208_250.mp4') },
  { id: 'video-13', title: 'Video 13', tags: ['Clips', 'Moments'],              source: require('../../assets/videos/VID_20260224_211203_828.mp4') },
  { id: 'video-14', title: 'Video 14', tags: ['Clips', 'Street'],               source: require('../../assets/videos/VID_20260224_211633_035.mp4') },
  { id: 'video-15', title: 'Video 15', tags: ['Travel', 'Day'],                 source: require('../../assets/videos/VID_20260224_211956_867.mp4') },
  { id: 'video-16', title: 'Video 16', tags: ['Urban', 'Night'],                source: require('../../assets/videos/VID_20260224_212038_004.mp4') },
  { id: 'video-17', title: 'Video 17', tags: ['Lifestyle', 'B-roll'],           source: require('../../assets/videos/VID_20260224_213537_860.mp4') },
  { id: 'video-18', title: 'Video 18', tags: ['Nature', 'Slow'],                source: require('../../assets/videos/VID_20260224_213639_615.mp4') },
  { id: 'video-19', title: 'Video 19', tags: ['Sports', 'Motion'],              source: require('../../assets/videos/VID_20260224_215255_051.mp4') },
  { id: 'video-20', title: 'Video 20', tags: ['Music', 'Vibe'],                 source: require('../../assets/videos/VID_20260224_220159_704.mp4') },
  { id: 'video-21', title: 'Video 21', tags: ['Spring', 'Outdoor'],             source: require('../../assets/videos/VID_20260416_200910_873.mp4') },
  { id: 'video-22', title: 'Video 22', tags: ['City', 'Golden hour'],           source: require('../../assets/videos/VID_20260416_201053_575.mp4') },
  { id: 'video-23', title: 'Video 23', tags: ['Walk', 'Cinematic'],             source: require('../../assets/videos/VID_20260416_201127_758.mp4') },
  { id: 'video-24', title: 'Video 24', tags: ['Morning', 'Light'],              source: require('../../assets/videos/VID_20260417_094053_695.mp4') },
  { id: 'video-25', title: 'Video 25', tags: ['Details', 'Macro'],              source: require('../../assets/videos/VID_20260417_095712_899.mp4') },
  { id: 'video-26', title: 'Video 26', tags: ['Sky', 'Clouds'],                 source: require('../../assets/videos/VID_20260417_095941_753.mp4') },
  { id: 'video-27', title: 'Video 27', tags: ['Quiet', 'Mood'],                 source: require('../../assets/videos/VID_20260417_100008_614.mp4') },
  { id: 'video-28', title: 'Video 28', tags: ['Sunset', 'Silhouette'],          source: require('../../assets/videos/VID_20260417_100107_210.mp4') },
  { id: 'video-29', title: 'Video 29', tags: ['Blue hour', 'Urban'],            source: require('../../assets/videos/VID_20260424_074847_189.mp4') },
  { id: 'video-30', title: 'Video 30', tags: ['Night', 'Neon'],                 source: require('../../assets/videos/VID_20260424_212407_790.mp4') },
];

type VideoEntry     = (typeof videos)[number];
type LibraryGridRow = (VideoEntry | null)[];


// ─────────────────────────────────────────────────────────────────────────────
// Asset URI cache
// ─────────────────────────────────────────────────────────────────────────────

const assetUriCache:   Partial<Record<string, string>>          = {};
const assetUriPromise: Partial<Record<string, Promise<string>>> = {};

async function resolveAssetUri(videoId: string, source: number): Promise<string> {
  if (assetUriCache[videoId])   return assetUriCache[videoId]!;
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


// ─────────────────────────────────────────────────────────────────────────────
// Thumbnail store
// ─────────────────────────────────────────────────────────────────────────────

type ThumbState = { uri: string | null; error: boolean; loading: boolean };

const thumbStore:     Map<string, ThumbState>                   = new Map();
const thumbListeners: Map<string, Set<(s: ThumbState) => void>> = new Map();
const thumbInFlight:  Map<string, Promise<void>>                = new Map();

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
      const { uri }  = await VideoThumbnails.getThumbnailAsync(localUri, { time: 1000, quality: 0.6 });
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


// ─────────────────────────────────────────────────────────────────────────────
// Preserved scroll / playback state
// ─────────────────────────────────────────────────────────────────────────────

const preserved = {
  feedIndex:      0,
  feedTimestamp:  0,
  libraryScrollY: 0,
};

// Per-video interaction state preserved across tab switches
const likedVideos  = new Set<string>();
const savedVideos  = new Set<string>();


// ─────────────────────────────────────────────────────────────────────────────
// Theme tokens
// ─────────────────────────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    bg:            '#0D0D0D',
    chip:          '#2A2A2A',
    pillBg:        'rgba(255,255,255,0.15)',
    pillText:      '#FFFFFF',
    text:          '#F5F5F5',
    subtext:       '#888888',
    border:        '#2A2A2A',
    navBg:         '#111111',
    navBorder:     '#222222',
    activeTab:     '#F5F5F5',
    activeTabText: '#111111',
    switchTrackOn: '#AAAAAA',
    searchBg:      '#1E1E1E',
    searchBorder:  '#333333',
  },
  light: {
    bg:            '#FFFFFF',
    chip:          '#E8E8E8',
    pillBg:        'rgba(0,0,0,0.55)',
    pillText:      '#FFFFFF',
    text:          '#111111',
    subtext:       '#666666',
    border:        '#E6E8EB',
    navBg:         '#FFFFFF',
    navBorder:     '#E6E8EB',
    activeTab:     '#111111',
    activeTabText: '#FFFFFF',
    switchTrackOn: '#555555',
    searchBg:      '#F5F5F5',
    searchBorder:  '#E0E0E0',
  },
};


// ─────────────────────────────────────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const [theme,          setTheme]          = useState<Theme>('dark');
  const [activeTab,      setActiveTab]      = useState<Tab>('feed');
  const [prevTab,        setPrevTab]        = useState<Tab>('reels');
  const [feedStartIndex, setFeedStartIndex] = useState<number | null>(null);

  const feedFromLibrary = useRef(false);

  // ── Animated slide position ───────────────────────────────────────────────
  // translateX drives the slide container directly on the UI thread.
  // feed  → 0,            reels → -SCREEN_WIDTH
  // We use a single value so there's zero JS-thread math per frame.

  const translateX  = useRef(new Animated.Value(activeTab === 'feed' ? 0 : -SCREEN_WIDTH)).current;

  // Mutable ref so PanResponder callbacks always read the *current* page
  // without needing to re-create the responder (avoids stale closure bug).
  const activeTabRef = useRef<Tab>(activeTab);
  useEffect(() => { activeTabRef.current = activeTab; }, [activeTab]);

  const t = THEMES[theme];

  // Snap to the correct position whenever the tab changes via button / back press.
  useEffect(() => {
    if (activeTab === 'settings') return;
    const toValue = activeTab === 'feed' ? 0 : -SCREEN_WIDTH;
    Animated.spring(translateX, {
      toValue,
      useNativeDriver: true,
      tension:         200,
      friction:        26,
    }).start();
  }, [activeTab]);

  // ── Settings navigation ──────────────────────────────────────────────────

  const openSettings = () => {
    setPrevTab(activeTab === 'settings' ? prevTab : activeTab);
    setActiveTab('settings');
  };

  const closeSettings = () => setActiveTab(prevTab);

  // ── Library → Feed navigation ────────────────────────────────────────────

  const openFeedAtIndex = useCallback((index: number) => {
    preserved.feedIndex     = index;
    preserved.feedTimestamp = 0;
    feedFromLibrary.current = true;
    setFeedStartIndex(index);
    setActiveTab('feed');
  }, []);

  // ── Android hardware back button ─────────────────────────────────────────

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeTab === 'feed' && feedFromLibrary.current) {
        feedFromLibrary.current = false;
        setActiveTab('reels');
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [activeTab]);

  // ── Fluid horizontal swipe PanResponder ──────────────────────────────────
  // Key design decisions:
  //   1. Single `translateX` Animated.Value — driven directly, zero derived math.
  //   2. `activeTabRef` read inside callbacks — never a stale closure.
  //   3. No `onMoveShouldSetPanResponderCapture` — that fights child FlatLists.
  //   4. Base offset captured on grant so mid-spring drags feel glued to finger.

  const baseOffsetRef = useRef(0); // translateX value at the moment the finger lands

  const swipePan = useRef(
    PanResponder.create({
      // Activate only when clearly horizontal — let vertical scrolls through.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,

      onPanResponderGrant: () => {
        // Stop any in-flight spring and capture the current visual position
        // so the view doesn't jump when the finger lands mid-animation.
        translateX.stopAnimation((val) => {
          baseOffsetRef.current = val;
          translateX.setOffset(val);
          translateX.setValue(0);
        });
      },

      onPanResponderMove: (_, g) => {
        const cur = activeTabRef.current;
        let dx = g.dx;
        // Rubber-band resistance at the edges
        if (cur === 'feed'  && dx > 0) dx *= 0.18;
        if (cur === 'reels' && dx < 0) dx *= 0.18;
        translateX.setValue(dx);
      },

      onPanResponderRelease: (_, g) => {
        // Collapse offset + value back into a plain value before springing
        translateX.flattenOffset();

        const cur       = activeTabRef.current;
        const velocity  = g.vx;        // px/ms — positive = rightward
        const totalDx   = g.dx;
        const threshold = SCREEN_WIDTH * 0.25;

        // Determine target tab
        let newTab: Tab = cur;
        if      ((velocity < -0.5 || totalDx < -threshold) && cur === 'feed')  newTab = 'reels';
        else if ((velocity >  0.5 || totalDx >  threshold) && cur === 'reels') newTab = 'feed';

        const toValue = newTab === 'feed' ? 0 : -SCREEN_WIDTH;

        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          tension:         220,
          friction:        26,
          velocity:        velocity * SCREEN_WIDTH, // convert to px/s scale spring expects
        }).start();

        if (newTab !== cur) setActiveTab(newTab);
      },

      onPanResponderTerminate: () => {
        translateX.flattenOffset();
        // Snap back to wherever we currently are
        const toValue = activeTabRef.current === 'feed' ? 0 : -SCREEN_WIDTH;
        Animated.spring(translateX, {
          toValue,
          useNativeDriver: true,
          tension:         220,
          friction:        26,
        }).start();
      },
    }),
  ).current;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: t.navBg }]}>
      <View style={[styles.app, { backgroundColor: t.bg }]}>
        <View style={styles.content}>

          {activeTab === 'settings' ? (
            <SettingsScreen
              theme={theme}
              t={t}
              onToggleTheme={() => setTheme((p) => (p === 'dark' ? 'light' : 'dark'))}
              onBack={closeSettings}
            />
          ) : (
            /* Sliding container — both screens side by side, translated together */
            <Animated.View
              style={[
                styles.slideContainer,
                { transform: [{ translateX }] },
              ]}
              {...swipePan.panHandlers}
            >
              {/* Feed — left panel */}
              <View style={styles.slidePanel}>
                <FeedScreen
                  t={t}
                  isVisible={activeTab === 'feed'}
                  startIndex={feedStartIndex}
                  onStartIndexConsumed={() => setFeedStartIndex(null)}
                />
              </View>

              {/* Reels / Library — right panel */}
              <View style={styles.slidePanel}>
                <ReelsScreen
                  t={t}
                  isVisible={activeTab === 'reels'}
                  onOpenSettings={openSettings}
                  onOpenFeedAtIndex={openFeedAtIndex}
                />
              </View>
            </Animated.View>
          )}

        </View>

        {activeTab !== 'settings' && (
          <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} t={t} />
        )}

      </View>
    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// FeedScreen
// ─────────────────────────────────────────────────────────────────────────────

function FeedScreen({
  t,
  isVisible,
  startIndex,
  onStartIndexConsumed,
}: {
  t:                    typeof THEMES.dark;
  isVisible:            boolean;
  startIndex:           number | null;
  onStartIndexConsumed: () => void;
}) {
  const [activeIndex, setActiveIndex] = useState(preserved.feedIndex);
  const [pausedMap,   setPausedMap]   = useState<Record<number, boolean>>({});
  const [showIconMap, setShowIconMap] = useState<Record<number, boolean>>({});

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (startIndex !== null && flatListRef.current) {
      flatListRef.current.scrollToIndex({ index: startIndex, animated: false });
      setActiveIndex(startIndex);
      setPausedMap({});
      onStartIndexConsumed();
    }
  }, [startIndex]);

  useEffect(() => {
    if (isVisible && flatListRef.current && preserved.feedIndex > 0 && startIndex === null) {
      flatListRef.current.scrollToIndex({ index: preserved.feedIndex, animated: false });
    }
  }, [isVisible]);

  useEffect(() => {
    const next = activeIndex + 2;
    if (videos[next]) resolveAssetUri(videos[next].id, videos[next].source).catch(() => {});
  }, [activeIndex]);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        const idx = viewableItems[0].index!;
        setActiveIndex(idx);
        preserved.feedIndex = idx;
        setPausedMap((prev) => ({ ...prev, [idx]: false }));
      }
    },
    [],
  );

  const togglePlayPause = (index: number) => {
    setPausedMap  ((prev) => ({ ...prev, [index]: !prev[index] }));
    setShowIconMap((prev) => ({ ...prev, [index]: true }));
    setTimeout(() => setShowIconMap((prev) => ({ ...prev, [index]: false })), 700);
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


// ─────────────────────────────────────────────────────────────────────────────
// FeedVideoItem
// ─────────────────────────────────────────────────────────────────────────────

type FeedVideoItemProps = {
  item:              (typeof videos)[0];
  index:             number;
  activeIndex:       number;
  isActive:          boolean;
  isPaused:          boolean;
  showIcon:          boolean;
  t:                 typeof THEMES.dark;
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
  const [resolvedUri, setResolvedUri] = useState<string | null>(assetUriCache[item.id] ?? null);

  // Per-video interaction state
  const [isLiked,      setIsLiked]      = useState(likedVideos.has(item.id));
  const [isSaved,      setIsSaved]      = useState(savedVideos.has(item.id));
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // Animation refs for action buttons
  const likeScale  = useRef(new Animated.Value(1)).current;
  const saveScale  = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;
  const likeColor  = useRef(new Animated.Value(isLiked ? 1 : 0)).current;

  // Double-tap heart animation
  const heartScale   = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  // Double-tap detection
  const lastTapRef       = useRef(0);
  const singleTapTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shouldRenderVideo = Math.abs(index - activeIndex) <= 1;

  useEffect(() => {
    if (!shouldRenderVideo || resolvedUri) return;
    let alive = true;
    resolveAssetUri(item.id, item.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch((e)  => { console.warn('[URI]', item.id, e); });
    return () => { alive = false; };
  }, [item.id, shouldRenderVideo]);

  const { uri: thumbUri } = useThumb(item.id, item.source);

  const handleShare = useCallback(async () => {
    animateButton(shareScale);
    await shareVideo(item, thumbUri ?? undefined);
  }, [item, thumbUri]);

  const onTimestampChange = useCallback(
    (ts: number) => { if (isActive) preserved.feedTimestamp = ts; },
    [isActive],
  );

  // ── Button press animation ────────────────────────────────────────────────

  function animateButton(scaleAnim: Animated.Value) {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.75, useNativeDriver: true, speed: 80, bounciness: 0 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 14 }),
    ]).start();
  }

  // ── Like ─────────────────────────────────────────────────────────────────

  const handleLike = useCallback(() => {
    const next = !isLiked;
    setIsLiked(next);
    if (next) likedVideos.add(item.id); else likedVideos.delete(item.id);

    animateButton(likeScale);
    Animated.spring(likeColor, {
      toValue:         next ? 1 : 0,
      useNativeDriver: false,
      speed:           40,
      bounciness:      8,
    }).start();
  }, [isLiked, item.id]);

  // ── Bookmark / Save ───────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const next = !isSaved;
    setIsSaved(next);
    if (next) savedVideos.add(item.id); else savedVideos.delete(item.id);
    animateButton(saveScale);
  }, [isSaved, item.id]);

  // ── Double-tap to like ────────────────────────────────────────────────────

  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }

      if (!isLiked) {
        setIsLiked(true);
        likedVideos.add(item.id);
        animateButton(likeScale);
        Animated.spring(likeColor, { toValue: 1, useNativeDriver: false, speed: 40, bounciness: 8 }).start();
      }

      setShowDoubleTapHeart(true);
      heartScale.setValue(0);
      heartOpacity.setValue(1);
      Animated.sequence([
        Animated.spring(heartScale, {
          toValue:         1,
          useNativeDriver: true,
          speed:           16,
          bounciness:      18,
        }),
        Animated.delay(280),
        Animated.timing(heartOpacity, {
          toValue:         0,
          duration:        280,
          useNativeDriver: true,
        }),
      ]).start(() => setShowDoubleTapHeart(false));
    } else {
      singleTapTimer.current = setTimeout(() => {
        onTogglePlayPause(index);
      }, 310);
    }
    lastTapRef.current = now;
  }, [isLiked, item.id, index, onTogglePlayPause]);

  useEffect(() => () => {
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
  }, []);

  const likeIconColor = likeColor.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.9)', '#FF3B5C'],
  });

  const saveIconColor = isSaved ? '#FFFFFF' : 'rgba(255,255,255,0.9)';

  return (
    <View style={styles.videoPage}>

      {shouldRenderVideo && resolvedUri ? (
        <ExpoVideoPlayer
          videoId={item.id}
          uri={resolvedUri}
          isActive={isActive}
          isPaused={isPaused}
          initialTimestamp={
            isActive && index === preserved.feedIndex ? preserved.feedTimestamp : 0
          }
          onTimestampChange={onTimestampChange}
        />
      ) : (
        <View style={styles.videoPlaceholder}>
          {thumbUri
            ? <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            : <ActivityIndicator size="large" color="rgba(255,255,255,0.7)" />
          }
        </View>
      )}

      {/* Full-screen tap area — single tap = play/pause, double tap = like */}
      <TouchableOpacity
        activeOpacity={1}
        style={styles.tapOverlay}
        onPress={handleTap}
      >
        {/* Play/pause icon (single tap) */}
        {showIcon && (
          <View style={styles.playPauseIconWrap}>
            <Ionicons name={isPaused ? 'play' : 'pause'} size={52} color="#FFFFFF" />
          </View>
        )}

        {/* Double-tap heart burst */}
        {showDoubleTapHeart && (
          <Animated.View
            style={[
              styles.doubleTapHeart,
              { transform: [{ scale: heartScale }], opacity: heartOpacity },
            ]}
            pointerEvents="none"
          >
            <Ionicons name="heart" size={100} color="#FF3B5C" />
          </Animated.View>
        )}
      </TouchableOpacity>

      {/* Title + tag pills overlay */}
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

      {/* Side action buttons */}
      <View style={styles.feedActions}>

        {/* Like button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Like"
          onPress={handleLike}
        >
          <Animated.View
            style={[
              styles.glassButton,
              { width: 52, height: 52, borderRadius: 26 },
              { transform: [{ scale: likeScale }] },
              isLiked && styles.glassButtonLiked,
            ]}
          >
            <Animated.Text style={{ color: likeIconColor, fontSize: 22 }}>
              {isLiked ? '♥' : '♡'}
            </Animated.Text>
          </Animated.View>
        </Pressable>

        {/* Bookmark / Save button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Save"
          onPress={handleSave}
        >
          <Animated.View
            style={[
              styles.glassButton,
              { width: 52, height: 52, borderRadius: 26 },
              { transform: [{ scale: saveScale }] },
              isSaved && styles.glassButtonSaved,
            ]}
          >
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={saveIconColor}
            />
          </Animated.View>
        </Pressable>

        {/* Share button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Share"
          onPress={handleShare}
        >
          <Animated.View
            style={[
              styles.glassButton,
              { width: 52, height: 52, borderRadius: 26 },
              { transform: [{ scale: shareScale }] },
            ]}
          >
            <Ionicons name="share-social" size={22} color="#FFFFFF" />
          </Animated.View>
        </Pressable>

      </View>

    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ExpoVideoPlayer
// ─────────────────────────────────────────────────────────────────────────────

type ExpoVideoPlayerProps = {
  videoId:            string;
  uri:                string;
  isActive:           boolean;
  isPaused:           boolean;
  initialTimestamp?:  number;
  onTimestampChange?: (seconds: number) => void;
  showSeekBar?:       boolean;
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
    if (initialTimestamp > 0) p.currentTime = initialTimestamp;
  });

  const [duration,        setDuration]        = useState(0);
  const [currentTime,     setCurrentTime]     = useState(initialTimestamp);
  const [isScrubbing,     setIsScrubbing]     = useState(false);
  const [scrubRatio,      setScrubRatio]      = useState(0);
  const [seekBarActive,   setSeekBarActive]   = useState(false);
  const [scrubPreviewUri, setScrubPreviewUri] = useState<string | null>(null);
  const [seekLayoutW,     setSeekLayoutW]     = useState(0);

  const seekBarWidthRef   = useRef(SCREEN_WIDTH);
  const lastScrubRatioRef = useRef(0);
  const pollIntervalRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const previewGenRef     = useRef(0);
  const resumeTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const panStateRef = useRef({ player, duration: 0, isActive, isPaused, onTimestampChange });
  panStateRef.current = { player, duration, isActive, isPaused, onTimestampChange };

  const scrubRatioFromLocation = (locationX: number) => {
    const w = seekBarWidthRef.current;
    if (w <= 0) return 0;
    const r = clamp(locationX / w, 0, 1);
    lastScrubRatioRef.current = r;
    return r;
  };

  useEffect(() => {
    const needsPoll  = showSeekBar || typeof onTimestampChange === 'function';
    const shouldPoll = needsPoll && isActive && !isPaused && !isScrubbing;

    if (shouldPoll) {
      pollIntervalRef.current = setInterval(() => {
        try {
          const ct = player.currentTime ?? 0;
          const du = player.duration   ?? 0;
          setCurrentTime(ct);
          if (du > 0) setDuration(du);
          onTimestampChange?.(ct);
        } catch {}
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
  }, [isActive, isPaused, isScrubbing, showSeekBar, onTimestampChange, player]);

  useEffect(() => {
    if (isActive && !isPaused) player.play();
    else                       player.pause();
  }, [isActive, isPaused, player]);

  useEffect(() => {
    if (!showSeekBar || !isScrubbing || duration <= 0) {
      setScrubPreviewUri(null);
      return;
    }

    const tSec     = scrubRatio * duration;
    const cacheKey = `${videoId}|${Math.round(tSec * 10)}`;
    const cached   = scrubThumbCache.get(cacheKey);

    if (cached) {
      setScrubPreviewUri(cached);
      return;
    }

    const myGen  = ++previewGenRef.current;
    const handle = setTimeout(async () => {
      if (previewGenRef.current !== myGen) return;
      const tMs = Math.min(
        Math.max(Math.floor(tSec * 1000), 0),
        Math.max(Math.floor(duration * 1000) - 1, 0),
      );
      try {
        const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
          time: tMs, quality: 0.38,
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
    () => () => { if (resumeTimerRef.current) clearTimeout(resumeTimerRef.current); },
    [],
  );

  const seekBarPan = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder:     () => true,
      onMoveShouldSetPanResponder:      () => true,
      onPanResponderTerminationRequest: () => true,

      onPanResponderGrant: (evt) => {
        if (resumeTimerRef.current) {
          clearTimeout(resumeTimerRef.current);
          resumeTimerRef.current = null;
        }
        panStateRef.current.player.pause();
        setIsScrubbing(true);
        setSeekBarActive(true);
        setScrubRatio(scrubRatioFromLocation(evt.nativeEvent.locationX));
      },

      onPanResponderMove: (evt) => {
        setScrubRatio(scrubRatioFromLocation(evt.nativeEvent.locationX));
      },

      onPanResponderRelease: (evt) => {
        const ratio = scrubRatioFromLocation(evt.nativeEvent.locationX);
        setScrubRatio(ratio);
        const {
          player: pl, duration: dur, isActive: act, isPaused: paused, onTimestampChange: onTs,
        } = panStateRef.current;
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
        const {
          player: pl, duration: dur, isActive: act, isPaused: paused, onTimestampChange: onTs,
        } = panStateRef.current;
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
    : duration > 0 ? clamp(currentTime / duration, 0, 1) : 0;

  const previewLeft = useMemo(() => {
    const w = seekLayoutW > 0 ? seekLayoutW : seekBarWidthRef.current;
    if (w <= 0) return (SCREEN_WIDTH - SEEK_PREVIEW_W) / 2;
    return clamp(progress * w - SEEK_PREVIEW_W / 2, 0, Math.max(0, w - SEEK_PREVIEW_W));
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
          {isScrubbing && scrubPreviewUri && (
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
          )}

          <View style={styles.seekTrackWrapper} {...seekBarPan.panHandlers}>
            <View
              style={[
                styles.seekTrack,
                { height: seekBarActive ? SEEK_BAR_ACTIVE_H : SEEK_BAR_HEIGHT },
              ]}
            >
              <View style={[styles.seekFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
          </View>

        </View>
      )}

    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// shareVideo
// ─────────────────────────────────────────────────────────────────────────────

async function shareVideo(video: (typeof videos)[0], thumbUri?: string) {
  try {
    const sharingAvailable = await Sharing.isAvailableAsync();

    if (sharingAvailable && thumbUri) {
      await Sharing.shareAsync(thumbUri, {
        mimeType:    'image/jpeg',
        dialogTitle: video.title,
        UTI:         'public.jpeg',
      });
      return;
    }

    const result = await Share.share(
      {
        title:   video.title,
        message: `Check out "${video.title}" — ${video.tags.join(', ')}`,
        url:     thumbUri ?? '',
      },
      { dialogTitle: video.title },
    );

    if (result.action === Share.dismissedAction) return;

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.includes('User did not share') ||
      message.includes('cancel') ||
      message.includes('dismissed')
    ) return;
    Alert.alert('Share failed', 'Unable to share this reel. Please try again.');
  }
}


// ─────────────────────────────────────────────────────────────────────────────
// RoundIconButton  (library header)
// ─────────────────────────────────────────────────────────────────────────────

type RoundIconButtonProps = {
  icon:      keyof typeof Ionicons.glyphMap;
  label:     string;
  color:     string;
  iconColor: string;
  size?:     number;
  onPress:   () => void;
};

function RoundIconButton({ icon, label, color, iconColor, size = 52, onPress }: RoundIconButtonProps) {
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


// ─────────────────────────────────────────────────────────────────────────────
// ReelsScreen  (library grid + search)
// ─────────────────────────────────────────────────────────────────────────────

type ReelsScreenProps = {
  t:                 typeof THEMES.dark;
  isVisible:         boolean;
  onOpenSettings:    () => void;
  onOpenFeedAtIndex: (index: number) => void;
};

function ReelsScreen({ t, isVisible, onOpenSettings, onOpenFeedAtIndex }: ReelsScreenProps) {
  const [selectedTag,    setSelectedTag]    = useState<string>('All');
  const [previewVideo,   setPreviewVideo]   = useState<(typeof videos)[0] | null>(null);
  const [searchQuery,    setSearchQuery]    = useState('');
  const [searchVisible,  setSearchVisible]  = useState(false);
  const [searchFocused,  setSearchFocused]  = useState(false);

  // Animated values for search bar slide-in
  const searchWidth   = useRef(new Animated.Value(0)).current;
  const searchOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const flatListRef = useRef<FlatList<LibraryGridRow>>(null);
  const allTags     = ['All', 'Nature', 'Travel', 'Urban', 'Sports', 'Food'];

  // ── Auto-collapse search when tab becomes hidden ──────────────────────────
  useEffect(() => {
    if (!isVisible && searchVisible) {
      collapseSearch();
    }
  }, [isVisible]);

  // ── Search toggle ────────────────────────────────────────────────────────

  // Shared collapse logic — called by button, scroll, and tab-switch
  const collapseSearch = useCallback(() => {
    searchInputRef.current?.blur();
    Animated.parallel([
      Animated.timing(searchWidth, {
        toValue:         0,
        duration:        260,
        easing:          Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(searchOpacity, {
        toValue:         0,
        duration:        200,
        easing:          Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
    ]).start(() => {
      setSearchVisible(false);
      setSearchQuery('');
    });
  }, [searchWidth, searchOpacity]);

  const openSearch = () => {
    setSearchVisible(true);
    Animated.parallel([
      Animated.spring(searchWidth, {
        toValue:         1,
        useNativeDriver: false,
        tension:         180,
        friction:        20,
      }),
      Animated.timing(searchOpacity, {
        toValue:         1,
        duration:        180,
        useNativeDriver: false,
      }),
    ]).start(() => {
      searchInputRef.current?.focus();
    });
  };

  const closeSearch = () => collapseSearch();

  // Collapse search on scroll — only if user actually scrolled (dy > 4px)
  const onGridScroll = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      preserved.libraryScrollY = e.nativeEvent.contentOffset.y;
      if (searchVisible && e.nativeEvent.contentOffset.y > 4) {
        collapseSearch();
      }
    },
    [searchVisible, collapseSearch],
  );

  // ── Filtering logic ───────────────────────────────────────────────────────

  const filteredVideos = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return videos.filter((v) => {
      const matchesTag = selectedTag === 'All' || v.tags.includes(selectedTag);
      if (!q) return matchesTag;
      const matchesSearch =
        v.title.toLowerCase().includes(q) ||
        v.tags.some((tag) => tag.toLowerCase().includes(q));
      return matchesTag && matchesSearch;
    });
  }, [searchQuery, selectedTag]);

  const gridRows = useMemo(() => buildRows<VideoEntry>(filteredVideos, GRID_COLS), [filteredVideos]);

  const onListLayout = useCallback(() => {
    if (preserved.libraryScrollY > 0 && flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: preserved.libraryScrollY, animated: false });
    }
  }, []);

  const searchBarWidth = searchWidth.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '72%'],
  });

  return (
    <View style={[styles.reelsScreen, { backgroundColor: t.bg }]}>

      {/* ── Header ── */}
      <View style={[styles.reelsHeader, { paddingTop: STATUS_BAR_HEIGHT + 8 }]}>
        {/* Logo — hidden when search is open */}
        {!searchVisible && (
          <Image
            source={require('../../assets/images/logo.png')}
            style={styles.appLogo}
            resizeMode="contain"
          />
        )}

        {/* Animated search input */}
        {searchVisible && (
          <Animated.View
            style={[
              styles.searchInputContainer,
              {
                width:           searchBarWidth,
                opacity:         searchOpacity,
                backgroundColor: t.searchBg,
                borderColor:     searchFocused ? '#FFFFFF' : t.searchBorder,
              },
            ]}
          >
            <Ionicons name="search" size={16} color={t.subtext} style={{ marginRight: 8 }} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              placeholder="Search videos, tags…"
              placeholderTextColor={t.subtext}
              style={[styles.searchInput, { color: t.text }]}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
                <Ionicons name="close-circle" size={16} color={t.subtext} />
              </Pressable>
            )}
          </Animated.View>
        )}

        <View style={styles.headerActions}>
          {/* Search toggle button */}
          <RoundIconButton
            icon={searchVisible ? 'close' : 'search'}
            label={searchVisible ? 'Close search' : 'Search'}
            size={42}
            color={searchVisible ? 'rgba(255,255,255,0.15)' : t.chip}
            iconColor={t.text}
            onPress={searchVisible ? closeSearch : openSearch}
          />
          {!searchVisible && (
            <RoundIconButton
              icon="settings"
              label="Settings"
              size={42}
              color={t.chip}
              iconColor={t.text}
              onPress={onOpenSettings}
            />
          )}
        </View>
      </View>

      {/* ── Search results count ── */}
      {searchQuery.trim().length > 0 && (
        <View style={styles.searchResultsBar}>
          <Text style={[styles.searchResultsText, { color: t.subtext }]}>
            {filteredVideos.length === 0
              ? 'No results found'
              : `${filteredVideos.length} video${filteredVideos.length === 1 ? '' : 's'} found`}
          </Text>
          {filteredVideos.length === 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Text style={[styles.searchClearText, { color: t.text }]}>Clear</Text>
            </Pressable>
          )}
        </View>
      )}

      {/* ── Tag filter chips ── */}
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

      {/* ── Thumbnail grid ── */}
      {filteredVideos.length > 0 ? (
        <FlatList<LibraryGridRow>
          ref={flatListRef}
          style={styles.libraryGridList}
          data={gridRows}
          keyExtractor={(_, i) => `row-${i}`}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.videoGrid}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={7}
          removeClippedSubviews
          onLayout={onListLayout}
          onScroll={onGridScroll}
          scrollEventThrottle={16}
          renderItem={({ item: row }) => (
            <View style={styles.gridRow}>
              {row.map((video, colIndex) =>
                video ? (
                  <GridThumbnailItem
                    key={video.id}
                    video={video}
                    onPress={() => setPreviewVideo(video)}
                    onLongPress={() => setPreviewVideo(video)}
                  />
                ) : (
                  // Invisible spacer — same dimensions but no background colour,
                  // so the last row stays aligned without showing a dummy tile.
                  <View key={`empty-${colIndex}`} style={styles.gridItemSpacer} />
                ),
              )}
            </View>
          )}
        />
      ) : (
        /* Empty state */
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color={t.subtext} />
          <Text style={[styles.emptyStateTitle, { color: t.text }]}>No results</Text>
          <Text style={[styles.emptyStateDesc, { color: t.subtext }]}>
            Try a different search term or tag
          </Text>
        </View>
      )}

      {/* ── Peek modal ── */}
      {previewVideo && (
        <VideoPeekModal
          video={previewVideo}
          onClose={() => setPreviewVideo(null)}
          onOpenFullScreen={(index) => {
            setPreviewVideo(null);
            onOpenFeedAtIndex(index);
          }}
        />
      )}

    </View>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// GridThumbnailItem
// ─────────────────────────────────────────────────────────────────────────────

type GridThumbnailItemProps = {
  video:       (typeof videos)[0];
  onPress:     () => void;
  onLongPress: () => void;
};

function GridThumbnailItem({ video, onPress, onLongPress }: GridThumbnailItemProps) {
  const { uri: thumbUri, error: thumbError } = useThumb(video.id, video.source);
  const isLiked = likedVideos.has(video.id);

  return (
    <TouchableOpacity
      style={styles.gridItem}
      activeOpacity={0.82}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={350}
    >
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

      {/* Small liked indicator on grid thumbnail */}
      {isLiked && (
        <View style={styles.gridLikeBadge} pointerEvents="none">
          <Ionicons name="heart" size={10} color="#FF3B5C" />
        </View>
      )}
    </TouchableOpacity>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// buildRows
// ─────────────────────────────────────────────────────────────────────────────

function buildRows<T>(arr: T[], cols: number): (T | null)[][] {
  const rows: (T | null)[][] = [];
  for (let i = 0; i < arr.length; i += cols) {
    const row = arr.slice(i, i + cols) as (T | null)[];
    while (row.length < cols) row.push(null);
    rows.push(row);
  }
  return rows;
}


// ─────────────────────────────────────────────────────────────────────────────
// VideoPeekModal
// ─────────────────────────────────────────────────────────────────────────────

type VideoPeekModalProps = {
  video:            (typeof videos)[0];
  onClose:          () => void;
  onOpenFullScreen: (index: number) => void;
};

function VideoPeekModal({ video, onClose, onOpenFullScreen }: VideoPeekModalProps) {
  const videoIndex = Math.max(0, videos.findIndex((v) => v.id === video.id));

  const [resolvedUri, setResolvedUri] = useState<string | null>(assetUriCache[video.id] ?? null);
  const [isLiked,     setIsLiked]     = useState(likedVideos.has(video.id));
  const [isSaved,     setIsSaved]     = useState(savedVideos.has(video.id));

  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const likeColor = useRef(new Animated.Value(isLiked ? 1 : 0)).current;

  const { uri: thumbUri } = useThumb(video.id, video.source);

  useEffect(() => {
    if (resolvedUri) return;
    let alive = true;
    resolveAssetUri(video.id, video.source)
      .then((uri) => { if (alive) setResolvedUri(uri); })
      .catch(() => {});
    return () => { alive = false; };
  }, [video.id]);

  function animateButton(scaleAnim: Animated.Value) {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.72, useNativeDriver: true, speed: 80, bounciness: 0 }),
      Animated.spring(scaleAnim, { toValue: 1,    useNativeDriver: true, speed: 20, bounciness: 14 }),
    ]).start();
  }

  const handleLike = () => {
    const next = !isLiked;
    setIsLiked(next);
    if (next) likedVideos.add(video.id); else likedVideos.delete(video.id);
    animateButton(likeScale);
    Animated.spring(likeColor, { toValue: next ? 1 : 0, useNativeDriver: false, speed: 40, bounciness: 8 }).start();
  };

  const handleSave = () => {
    const next = !isSaved;
    setIsSaved(next);
    if (next) savedVideos.add(video.id); else savedVideos.delete(video.id);
    animateButton(saveScale);
  };

  const likeIconColor = likeColor.interpolate({
    inputRange:  [0, 1],
    outputRange: ['rgba(255,255,255,0.9)', '#FF3B5C'],
  });

  const handleOpenFull = useCallback(() => {
    onOpenFullScreen(videoIndex);
  }, [videoIndex, onOpenFullScreen]);

  return (
    <Modal
      visible
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.peekBackdrop} onPress={onClose} />

      <View
        style={[
          styles.peekBlock,
          { marginTop: -(PEEK_CARD_H + PEEK_BAR_H) / 2 },
        ]}
        pointerEvents="box-none"
      >

        <Pressable style={styles.peekCard} onPress={handleOpenFull}>
          {resolvedUri ? (
            <ExpoVideoPlayer
              videoId={video.id}
              uri={resolvedUri}
              isActive
              isPaused={false}
              showSeekBar={false}
            />
          ) : (
            <View style={styles.peekPlaceholder}>
              {thumbUri
                ? <Image source={{ uri: thumbUri }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
                : <ActivityIndicator size="large" color="rgba(255,255,255,0.6)" />
              }
            </View>
          )}
        </Pressable>

        <View style={styles.peekActionBar}>

          <View style={styles.peekActionLeft}>

            {/* Like */}
            <Pressable onPress={handleLike}>
              <Animated.View style={[styles.peekActionBtn, { transform: [{ scale: likeScale }] }]}>
                <Animated.Text style={{ color: likeIconColor, fontSize: 22 }}>
                  {isLiked ? '♥' : '♡'}
                </Animated.Text>
              </Animated.View>
            </Pressable>

            {/* Bookmark */}
            <Pressable onPress={handleSave}>
              <Animated.View style={[styles.peekActionBtn, { transform: [{ scale: saveScale }] }]}>
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? '#FFFFFF' : 'rgba(255,255,255,0.9)'}
                />
              </Animated.View>
            </Pressable>

          </View>

          <View style={{ flex: 1 }} />

          <Pressable
            style={styles.peekShareBtn}
            onPress={async () => { await shareVideo(video, thumbUri ?? undefined); }}
          >
            <Ionicons name="share-social-outline" size={20} color="#FFFFFF" />
          </Pressable>

        </View>

      </View>
    </Modal>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// SettingsScreen
// ─────────────────────────────────────────────────────────────────────────────

type SettingsScreenProps = {
  theme:         Theme;
  t:             typeof THEMES.dark;
  onToggleTheme: () => void;
  onBack:        () => void;
};

function SettingsScreen({ theme, t, onToggleTheme, onBack }: SettingsScreenProps) {
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
            <Ionicons name="moon" size={20} color={t.subtext} style={{ marginRight: 12 }} />
            <View>
              <Text style={[styles.settingLabel, { color: t.text }]}>Dark Mode</Text>
              <Text style={[styles.settingDesc,  { color: t.subtext }]}>
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


// ─────────────────────────────────────────────────────────────────────────────
// BottomTabs
// ─────────────────────────────────────────────────────────────────────────────

type BottomTabsProps = {
  activeTab:   Tab;
  onChangeTab: (tab: Tab) => void;
  t:           typeof THEMES.dark;
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


// ─────────────────────────────────────────────────────────────────────────────
// TabButton
// ─────────────────────────────────────────────────────────────────────────────

type TabButtonProps = {
  icon:    keyof typeof Ionicons.glyphMap;
  label:   string;
  active:  boolean;
  onPress: () => void;
  t:       typeof THEMES.dark;
};

function TabButton({ icon, label, active, onPress, t }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabButton,
        active  && styles.tabButtonActive,
        pressed && { opacity: 0.72 },
      ]}
    >
      <Ionicons name={icon} size={25} color={active ? t.activeTab : t.subtext} />
      <Text
        style={[
          styles.tabLabel,
          { color: active ? t.activeTab : t.subtext, fontWeight: active ? '700' : '400' },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// Utility
// ─────────────────────────────────────────────────────────────────────────────

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}


// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // ── App shell ──────────────────────────────────────────────────────────────

  safeArea: { flex: 1 },
  app:      { flex: 1 },
  content:  { flex: 1, overflow: 'hidden' },

  // ── Sliding container — both screens laid side by side ────────────────────
  // Width = 2 × SCREEN_WIDTH so both panels fit without clipping.

  slideContainer: {
    flex:          1,
    flexDirection: 'row',
    width:         SCREEN_WIDTH * 2,
  },

  slidePanel: {
    width:    SCREEN_WIDTH,
    overflow: 'hidden',
  },


  // ── Feed ───────────────────────────────────────────────────────────────────

  feedScreen: {
    flex:            1,
    backgroundColor: '#000000',
  },

  videoPage: {
    height:          VIDEO_HEIGHT,
    backgroundColor: '#000000',
  },

  videoPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#0A0A0A',
    gap:             12,
  },

  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems:       'center',
    justifyContent:   'center',
    marginHorizontal: 72,
  },

  playPauseIconWrap: {
    backgroundColor: 'rgba(0,0,0,0.40)',
    borderRadius:    50,
    padding:         16,
  },

  // ── Double-tap heart burst ─────────────────────────────────────────────────

  doubleTapHeart: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    // Drop shadow for the heart
    shadowColor:   '#FF3B5C',
    shadowOffset:  { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius:  20,
    elevation:     20,
  },

  videoMeta: {
    position: 'absolute',
    left:     18,
    right:    84,
    bottom:   80,
    gap:      8,
  },

  videoTitle: {
    color:      '#FFFFFF',
    fontSize:   17,
    fontWeight: '800',
  },

  tagPillRow: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           6,
  },

  tagPill: {
    borderRadius:      20,
    paddingHorizontal: 11,
    paddingVertical:   5,
    backgroundColor:   'rgba(255,255,255,0.14)',
    borderWidth:       StyleSheet.hairlineWidth,
    borderColor:       'rgba(255,255,255,0.30)',
  },

  tagPillText: {
    fontSize:      12,
    fontWeight:    '600',
    color:         '#FFFFFF',
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

  glassButtonLiked: {
    backgroundColor: 'rgba(255,59,92,0.22)',
    borderColor:     'rgba(255,59,92,0.50)',
  },

  glassButtonSaved: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderColor:     'rgba(255,255,255,0.50)',
  },


  // ── Seek bar ───────────────────────────────────────────────────────────────

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

  seekPreviewImage: { width: '100%', height: '100%' },

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


  // ── Library / Reels screen ─────────────────────────────────────────────────

  reelsScreen: { flex: 1 },

  reelsHeader: {
    alignItems:        'flex-start',
    flexDirection:     'row',
    justifyContent:    'flex-start',
    paddingHorizontal: 12,
    paddingBottom:     4,
    gap:               10,
  },

  appLogo: {
    width:      176,
    height:     52,
    alignSelf:  'flex-start',
    marginLeft: -50,
  },
  headerActions: {
    flexDirection: 'row',
    gap:           10,
    marginLeft:    'auto',
    alignSelf:     'center',
    marginTop:     5,
  },

  // ── Search ─────────────────────────────────────────────────────────────────

  searchInputContainer: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    borderRadius:      22,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderWidth:       1.5,
    overflow:          'hidden',
    minWidth:          0,
  },

  searchInput: {
    flex:     1,
    fontSize: 15,
    padding:  0,
    margin:   0,
  },

  searchClearBtn: {
    padding:    4,
    marginLeft: 4,
  },

  searchResultsBar: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 18,
    paddingVertical:   6,
  },

  searchResultsText: {
    fontSize:   13,
    fontWeight: '500',
  },

  searchClearText: {
    fontSize:   13,
    fontWeight: '700',
  },

  emptyState: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            12,
    paddingBottom:  60,
  },

  emptyStateTitle: {
    fontSize:   20,
    fontWeight: '800',
  },

  emptyStateDesc: {
    fontSize:  14,
    textAlign: 'center',
  },

  chipScroll: {
    marginTop:  14,
    flexGrow:   0,
    flexShrink: 0,
  },

  chipScrollContent: {
    paddingHorizontal: 18,
    gap:               8,
    paddingVertical:   4,
    alignItems:        'center',
  },

  tagCard: {
    borderRadius:      20,
    paddingHorizontal: 16,
    paddingVertical:   9,
    justifyContent:    'center',
    alignItems:        'center',
  },

  tagText: { fontSize: 14, fontWeight: '700' },

  libraryGridList: { flex: 1 },

  videoGrid: {
    paddingTop:    14,
    paddingBottom: 24,
  },

  gridRow: {
    flexDirection: 'row',
    gap:           GRID_GAP,
    marginBottom:  GRID_GAP,
  },

  gridItem: {
    width:           GRID_ITEM_WIDTH,
    height:          GRID_ITEM_HEIGHT,
    borderRadius:    4,
    overflow:        'hidden',
    backgroundColor: '#1A1A1A',
  },

  // Invisible placeholder — keeps the last row's alignment without showing a dark tile
  gridItemSpacer: {
    width:  GRID_ITEM_WIDTH,
    height: GRID_ITEM_HEIGHT,
  },

  gridThumb: { width: '100%', height: '100%' },

  gridThumbPlaceholder: {
    width:           '100%',
    height:          '100%',
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#1A1A1A',
  },

  gridPlayBadge: {
    position:        'absolute',
    top:             6,
    right:           6,
    backgroundColor: 'rgba(0,0,0,0.50)',
    borderRadius:    8,
    padding:         3,
  },

  gridLikeBadge: {
    position:        'absolute',
    bottom:          6,
    left:            6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius:    8,
    padding:         3,
  },


  // ── Peek modal ─────────────────────────────────────────────────────────────

  peekBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.60)',
  },

  peekBlock: {
    position:      'absolute',
    top:           '50%',
    alignSelf:     'center',
    width:         PEEK_CARD_W,
    borderRadius:  12,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 10 },
    shadowOpacity: 0.60,
    shadowRadius:  20,
    elevation:     16,
  },

  peekCard: {
    width:           PEEK_CARD_W,
    height:          PEEK_CARD_H,
    backgroundColor: '#0A0A0A',
    overflow:        'hidden',
  },

  peekPlaceholder: {
    ...StyleSheet.absoluteFillObject,
    alignItems:      'center',
    justifyContent:  'center',
    backgroundColor: '#0A0A0A',
  },

  peekActionBar: {
    width:             PEEK_CARD_W,
    height:            PEEK_BAR_H,
    backgroundColor:   '#1A1A1A',
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: 8,
  },

  peekActionLeft: {
    flexDirection: 'row',
    alignItems:    'center',
  },

  peekActionBtn: {
    width:          46,
    height:         46,
    alignItems:     'center',
    justifyContent: 'center',
  },

  peekShareBtn: {
    width:          38,
    height:         38,
    borderRadius:   19,
    borderWidth:    1.5,
    borderColor:    'rgba(255,255,255,0.35)',
    alignItems:     'center',
    justifyContent: 'center',
    marginRight:    6,
  },


  // ── Settings ───────────────────────────────────────────────────────────────

  settingsScreen: { flex: 1, paddingHorizontal: 18 },

  settingsHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   32,
  },

  settingsTitle: { fontSize: 20, fontWeight: '800' },

  backButton: {
    width:          42,
    height:         42,
    borderRadius:   21,
    alignItems:     'center',
    justifyContent: 'center',
  },

  settingSection: {
    borderRadius: 14,
    borderWidth:  1,
    overflow:     'hidden',
  },

  settingRow: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: 16,
    paddingVertical:   18,
    borderBottomWidth: 1,
  },

  settingLabelWrap: { flexDirection: 'row', alignItems: 'center' },
  settingLabel:     { fontSize: 16, fontWeight: '700' },
  settingDesc:      { fontSize: 13, marginTop: 2 },


  // ── Bottom navigation ──────────────────────────────────────────────────────

  bottomTabs: {
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection:  'row',
    alignItems:     'flex-start',
    justifyContent: 'space-around',
    paddingTop:     10,
  },

  tabButton: {
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   16,
    height:         52,
    width:          76,
    gap:            3,
  },

  tabButtonActive: { backgroundColor: 'rgba(255,255,255,0.10)' },

  tabLabel: { fontSize: 10, letterSpacing: 0.3 },


  // ── Round icon button (library header) ────────────────────────────────────

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
