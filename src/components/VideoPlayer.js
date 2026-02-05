// src/components/VideoPlayer.js
import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  Text,
  Platform,
  Linking,
} from 'react-native';
import { Video } from 'expo-av';
import { WebView } from 'react-native-webview';
import YoutubePlayer from 'react-native-youtube-iframe'; // ✅ NUEVO
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useCourses } from '../context/CourseContext';

const { width, height } = Dimensions.get('window');

export default function VideoPlayer({ 
  videoUrl, 
  thumbnailUrl, 
  style, 
  autoPlay = false,
  showControls = true,
  resizeMode = 'contain'
}) {
  const videoRef = useRef(null);
  const [status, setStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [videoKey, setVideoKey] = useState(0);
  const [hasError, setHasError] = useState(false);
  const { getVideoSourceType, isYouTubeVideo } = useCourses();

  // Estados para YouTube Player
  const [playing, setPlaying] = useState(autoPlay);
  const [youtubeError, setYoutubeError] = useState(false);
  const [isYouTube, setIsYouTube] = useState(false);
  const [youtubeId, setYoutubeId] = useState(null);

  useEffect(() => {
    if (videoUrl) {
      setLoading(true);
      setHasError(false);
      setYoutubeError(false);
      setVideoKey(prev => prev + 1);
      
      // Detectar si es YouTube y extraer ID
      const checkIfYouTube = () => {
        try {
          if (isYouTubeVideo && isYouTubeVideo(videoUrl)) {
            setIsYouTube(true);
            const id = extractYouTubeId(videoUrl);
            setYoutubeId(id);
            console.log('🎬 VideoPlayer - Es YouTube, ID:', id);
          } else if (videoUrl.includes('youtube.com') || videoUrl.includes('youtu.be')) {
            setIsYouTube(true);
            const id = extractYouTubeId(videoUrl);
            setYoutubeId(id);
            console.log('🎬 VideoPlayer - Detected YouTube, ID:', id);
          } else {
            setIsYouTube(false);
            setYoutubeId(null);
          }
        } catch (error) {
          console.log('Error detectando YouTube:', error);
          setIsYouTube(false);
        }
      };
      
      checkIfYouTube();
    }
  }, [videoUrl]);

  // Función para extraer ID de YouTube
  const extractYouTubeId = (url) => {
    if (!url) return null;
    
    const patterns = [
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // Si el string ya es solo un ID (11 caracteres alfanuméricos)
    if (url.length === 11 && /^[a-zA-Z0-9_-]{11}$/.test(url)) {
      return url;
    }
    
    return null;
  };

  // Si no hay video URL
  if (!videoUrl) {
    return (
      <View style={[styles.container, style, styles.noVideoContainer]}>
        <Icon name="videocam-off" size={50} color="#999" />
        <Text style={styles.noVideoText}>No hay video disponible</Text>
      </View>
    );
  }

  console.log('🎬 VideoPlayer - URL:', videoUrl, 'Es YouTube:', isYouTube, 'ID:', youtubeId);

  // ✅ SI ES YOUTUBE - USAR react-native-youtube-iframe
  if (isYouTube && youtubeId) {
    console.log('🎯 Reproduciendo YouTube ID:', youtubeId);

    return (
      <View style={[styles.container, style]}>
        <YoutubePlayer
          key={`youtube-${youtubeId}-${videoKey}`}
          height={style?.height || width * 0.5625} // 16:9 aspect ratio
          width={width}
          videoId={youtubeId}
          play={playing}
          volume={100}
          playbackRate={1}
          playerParams={{
            controls: showControls ? 1 : 0,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            iv_load_policy: 3,
          }}
          onChangeState={(event) => {
            console.log('YouTube Player State:', event);
            if (event === 'ended') {
              setPlaying(false);
            }
            if (event === 'playing') {
              setLoading(false);
              setYoutubeError(false);
            }
          }}
          onError={(error) => {
            console.error('❌ YouTube Player Error:', error);
            setYoutubeError(true);
            setLoading(false);
            
            if (error === 'UNPLAYABLE') {
              Alert.alert(
                'Video no disponible',
                'Este video no se puede reproducir. Puede tener restricciones.',
                [
                  { 
                    text: 'Abrir en YouTube', 
                    onPress: () => Linking.openURL(videoUrl.includes('http') ? videoUrl : `https://youtube.com/watch?v=${youtubeId}`) 
                  },
                  { text: 'OK', style: 'cancel' }
                ]
              );
            }
          }}
          onReady={() => {
            console.log('✅ YouTube Player listo');
            setLoading(false);
            setYoutubeError(false);
          }}
          onPlaybackQualityChange={(quality) => {
            console.log('🎥 Calidad:', quality);
          }}
        />
        
        {/* Loading overlay */}
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#FF0000" />
            <Text style={styles.loadingText}>Cargando video de YouTube...</Text>
          </View>
        )}
        
        {/* Error overlay */}
        {youtubeError && (
          <View style={styles.errorOverlay}>
            <Icon name="youtube" size={50} color="#FF0000" />
            <Text style={styles.errorTitle}>Error con YouTube</Text>
            <Text style={styles.errorMessage}>
              No se pudo cargar el video de YouTube
            </Text>
            
            <TouchableOpacity
              style={styles.youtubeButton}
              onPress={() => Linking.openURL(videoUrl.includes('http') ? videoUrl : `https://youtube.com/watch?v=${youtubeId}`)}
            >
              <Icon name="play-circle" size={20} color="#fff" />
              <Text style={styles.youtubeButtonText}>Ver en YouTube</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.youtubeButton, styles.retryButton]}
              onPress={() => {
                setVideoKey(prev => prev + 1);
                setLoading(true);
                setYoutubeError(false);
              }}
            >
              <Icon name="refresh" size={20} color="#fff" />
              <Text style={styles.youtubeButtonText}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ✅ SI NO ES YOUTUBE (o no se pudo extraer ID) - USAR WebView o expo-av
  console.log('🎬 Video no-YouTube - Usando WebView');
  
  // Para otros videos (Vimeo, archivos, etc.)
  return (
    <View style={[styles.container, style]}>
      {isYouTube && !youtubeId ? (
        // Si se detectó YouTube pero no se pudo extraer ID
        <View style={[styles.errorOverlay, { position: 'relative' }]}>
          <Icon name="youtube" size={50} color="#FF0000" />
          <Text style={styles.errorTitle}>URL de YouTube no válida</Text>
          <Text style={styles.errorMessage}>
            No se pudo extraer el ID del video
          </Text>
          <Text style={styles.errorSubtext}>{videoUrl.substring(0, 60)}...</Text>
        </View>
      ) : (
        // Para videos no-YouTube
        <>
          <Video
            ref={videoRef}
            source={{ uri: videoUrl }}
            style={styles.video}
            resizeMode={resizeMode}
            useNativeControls={showControls}
            isLooping={false}
            shouldPlay={autoPlay}
            onLoadStart={() => {
              console.log('📥 Cargando video...');
              setLoading(true);
            }}
            onLoad={() => {
              console.log('✅ Video cargado');
              setLoading(false);
            }}
            onPlaybackStatusUpdate={setStatus}
            onError={(error) => {
              console.error('❌ Error en expo-av:', error);
              setLoading(false);
              setHasError(true);
            }}
          />
          
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Cargando video...</Text>
            </View>
          )}
          
          {hasError && (
            <View style={styles.errorOverlay}>
              <Icon name="video-off" size={50} color="#ef4444" />
              <Text style={styles.errorTitle}>Error de video</Text>
              <Text style={styles.errorMessage}>
                No se pudo cargar el video
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 200,
    width: '100%',
    aspectRatio: 16/9,
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  noVideoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#dee2e6',
    borderStyle: 'dashed',
  },
  noVideoText: {
    color: '#6c757d',
    marginTop: 10,
    fontSize: 16,
  },
  errorSubtext: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    zIndex: 10,
  },
  loadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '500',
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.95)',
    padding: 20,
    zIndex: 20,
  },
  errorTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 15,
    marginBottom: 10,
  },
  errorMessage: {
    color: '#ddd',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  youtubeButton: {
    marginTop: 15,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#FF0000',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 160,
    justifyContent: 'center',
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    marginTop: 10,
  },
  youtubeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
});