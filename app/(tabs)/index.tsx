import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type Tab = 'feed' | 'reels';

const NAV_HEIGHT = 76;
const SCREEN_HEIGHT = Dimensions.get('window').height;
const VIDEO_HEIGHT = SCREEN_HEIGHT - NAV_HEIGHT;

const videos = [
  {
    id: 'video-1',
    title: 'Video 1',
    source: require('../../assets/videos/VID_20260425_032402_349.mp4'),
  },
  {
    id: 'video-2',
    title: 'Video 2',
    source: require('../../assets/videos/VID_20260304_223952_738.mp4'),
  },
  {
    id: 'video-3',
    title: 'Video 3',
    source: require('../../assets/videos/VID_20260214_190958_137.mp4'),
  },
  {
    id: 'video-4',
    title: 'Video 4',
    source: require('../../assets/videos/VID_20260210_023909_596.mp4'),
  },
  {
    id: 'video-5',
    title: 'Video 5',
    source: require('../../assets/videos/VID_20260210_022238_888.mp4'),
  },
  {
    id: 'video-6',
    title: 'Video 6',
    source: require('../../assets/videos/VID_20260210_021721_055.mp4'),
  },
  {
    id: 'video-7',
    title: 'Video 7',
    source: require('../../assets/videos/VID_20260210_021318_411.mp4'),
  },
  {
    id: 'video-8',
    title: 'Video 8',
    source: require('../../assets/videos/VID_20260210_021253_958.mp4'),
  },
];

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  const goToPreviousTab = () => {
    setActiveTab((current) => (current === 'reels' ? 'feed' : current));
  };

  const goToNextTab = () => {
    setActiveTab((current) => (current === 'feed' ? 'reels' : current));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const horizontalMove = Math.abs(gestureState.dx);
        const verticalMove = Math.abs(gestureState.dy);
        return horizontalMove > 24 && horizontalMove > verticalMove * 1.5;
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -60) {
          goToNextTab();
        }

        if (gestureState.dx > 60) {
          goToPreviousTab();
        }
      },
    }),
  ).current;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.app} {...panResponder.panHandlers}>
        <View style={styles.content}>
          {activeTab === 'feed' ? <FeedScreen /> : <ReelsScreen />}
        </View>

        <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} />
      </View>
    </SafeAreaView>
  );
}

function FeedScreen() {
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const handleMomentumScrollEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setActiveVideoIndex(Math.round(offsetY / VIDEO_HEIGHT));
  };

  return (
    <View style={styles.feedScreen}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={VIDEO_HEIGHT}
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        renderItem={({ item, index }) => (
          <View style={styles.videoPage}>
            <Video
              source={item.source}
              style={styles.video}
              resizeMode={ResizeMode.COVER}
              shouldPlay={index === activeVideoIndex}
              isLooping
              isMuted={false}
            />

            <View style={styles.videoTitleBlock}>
              <Text style={styles.videoTitle}>{item.title}</Text>
            </View>

            <View style={styles.feedActions}>
              <RoundIconButton
                icon="heart"
                label="Like"
                color="#FFFFFF"
                iconColor="#111111"
                onPress={() => {}}
              />
              <RoundIconButton
                icon="share-social"
                label="Share"
                color="#FFFFFF"
                iconColor="#111111"
                onPress={() => {}}
              />
            </View>
          </View>
        )}
      />
    </View>
  );
}

function ReelsScreen() {
  return (
    <View style={styles.reelsScreen}>
      <View style={styles.reelsHeader}>
        <Text style={styles.reelsTitle}>Reel</Text>

        <View style={styles.headerActions}>
          <RoundIconButton
            icon="search"
            label="Search"
            size={42}
            color="#F0F2F5"
            iconColor="#15171A"
            onPress={() => {}}
          />
          <RoundIconButton
            icon="settings"
            label="Settings"
            size={42}
            color="#F0F2F5"
            iconColor="#15171A"
            onPress={() => {}}
          />
        </View>
      </View>

      <View style={styles.tagCard}>
        <Text style={styles.tagText}>Tag</Text>
      </View>

      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        numColumns={3}
        contentContainerStyle={styles.videoGrid}
        columnWrapperStyle={styles.videoGridRow}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <Pressable style={styles.gridItem}>
            <Video
              source={item.source}
              style={styles.gridVideo}
              resizeMode={ResizeMode.COVER}
              shouldPlay={false}
              isMuted
            />
          </Pressable>
        )}
      />
    </View>
  );
}

type BottomTabsProps = {
  activeTab: Tab;
  onChangeTab: (tab: Tab) => void;
};

function BottomTabs({ activeTab, onChangeTab }: BottomTabsProps) {
  return (
    <View style={styles.bottomTabs}>
      <TabButton
        icon="home"
        label="Home"
        active={activeTab === 'feed'}
        onPress={() => onChangeTab('feed')}
      />
      <TabButton
        icon="film"
        label="Reels"
        active={activeTab === 'reels'}
        onPress={() => onChangeTab('reels')}
      />
    </View>
  );
}

type TabButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
};

function TabButton({ icon, label, active, onPress }: TabButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={[styles.tabButton, active && styles.activeTabButton]}
    >
      <Ionicons
        name={icon}
        size={25}
        color={active ? '#FFFFFF' : '#69707A'}
      />
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
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        pressed && styles.pressedButton,
      ]}
    >
      <Ionicons name={icon} size={size * 0.46} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#050608',
  },
  app: {
    flex: 1,
    backgroundColor: '#050608',
  },
  content: {
    flex: 1,
    paddingBottom: NAV_HEIGHT,
  },
  feedScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  videoPage: {
    height: VIDEO_HEIGHT,
    backgroundColor: '#000000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  videoTitleBlock: {
    position: 'absolute',
    left: 18,
    right: 96,
    bottom: 28,
  },
  videoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  feedActions: {
    position: 'absolute',
    right: 16,
    bottom: 28,
    gap: 14,
  },
  roundIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 7,
  },
  pressedButton: {
    opacity: 0.74,
    transform: [{ scale: 0.96 }],
  },
  reelsScreen: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  reelsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reelsTitle: {
    color: '#111111',
    fontSize: 30,
    fontWeight: '900',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  tagCard: {
    alignSelf: 'flex-start',
    backgroundColor: '#F0F2F5',
    borderRadius: 8,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  tagText: {
    color: '#111111',
    fontSize: 16,
    fontWeight: '800',
  },
  videoGrid: {
    gap: 2,
    paddingTop: 18,
    paddingBottom: 18,
  },
  videoGridRow: {
    gap: 2,
  },
  gridItem: {
    aspectRatio: 0.72,
    backgroundColor: '#D9DEE4',
    flex: 1,
    maxWidth: '33%',
    overflow: 'hidden',
  },
  gridVideo: {
    height: '100%',
    width: '100%',
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: NAV_HEIGHT,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#E6E8EB',
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
    width: 76,
  },
  activeTabButton: {
    backgroundColor: '#111111',
  },
});
