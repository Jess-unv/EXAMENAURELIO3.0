import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  TouchableOpacity,
  ImageBackground,
  StatusBar,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "../context/ThemeContext";
import { LinearGradient } from "expo-linear-gradient";
import VideoPlayer from "../components/VideoPlayer";
import { useCourses } from "../context/CourseContext";

const { width, height } = Dimensions.get("window");

export default function AdminPreviewScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { isYouTubeVideo } = useCourses();
  const { courseData } = route.params; 

  console.log("📱 Datos del curso en preview:", {
    id: courseData?.id,
    title: courseData?.title,
    thumbnail: courseData?.thumbnail_url,
    lessons: courseData?.lessons?.length || 0,
    published: courseData?.is_published
  });

  // Estado para el reproductor de video
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [videoModalVisible, setVideoModalVisible] = useState(false);

  // ✅ CORREGIDO: Reproducir video usando VideoPlayer
  const playVideo = (lesson) => {
    if (!lesson?.video_url) {
      Alert.alert("Sin video", "Esta lección no tiene video disponible.");
      return;
    }

    console.log("🎬 Reproduciendo video en vista previa:", {
      lesson: lesson.title,
      url: lesson.video_url,
      isYouTube: isYouTubeVideo(lesson.video_url)
    });

    setSelectedLesson(lesson);
    setVideoModalVisible(true);
  };

  // ✅ CORREGIDO: Cerrar reproductor
  const closeVideoPlayer = () => {
    setVideoModalVisible(false);
    setSelectedLesson(null);
  };

  // ✅ CORREGIDO: Modal del video usando VideoPlayer
  const renderVideoModal = () => (
    <Modal
      visible={videoModalVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={closeVideoPlayer}
    >
      <SafeAreaView style={styles.videoModalContainer}>
        <View style={styles.videoHeader}>
          <TouchableOpacity onPress={closeVideoPlayer} style={styles.closeVideoButton}>
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.videoTitleContainer}>
            <Text style={styles.videoTitle} numberOfLines={2}>
              {selectedLesson?.title || "Video de lección"}
            </Text>
            <Text style={styles.videoSubtitle} numberOfLines={1}>
              {courseData?.title}
            </Text>
          </View>
        </View>
        
        <View style={styles.videoPlayerContainer}>
          <VideoPlayer 
            videoUrl={selectedLesson?.video_url}
            style={styles.videoPlayer}
            autoPlay={true}
            showControls={true}
          />
        </View>
        
        <ScrollView style={styles.videoDetails}>
          <Text style={[styles.lessonDetailTitle, { color: '#fff' }]}>
            {selectedLesson?.title}
          </Text>
          
          {selectedLesson?.description && (
            <Text style={[styles.lessonDetailDescription, { color: '#aaa' }]}>
              {selectedLesson.description}
            </Text>
          )}
          
          <View style={styles.videoInfo}>
            <View style={styles.infoRow}>
              <Icon name="information-outline" size={18} color="#3b82f6" />
              <Text style={[styles.infoText, { color: '#fff' }]}>
                Vista previa de administrador
              </Text>
            </View>
            
            {selectedLesson?.duration > 0 && (
              <View style={styles.infoRow}>
                <Icon name="clock-outline" size={18} color="#3b82f6" />
                <Text style={[styles.infoText, { color: '#fff' }]}>
                  Duración: {selectedLesson.duration} minutos
                </Text>
              </View>
            )}
            
            {selectedLesson?.video_url && (
              <View style={styles.infoRow}>
                <Icon name="video" size={18} color="#3b82f6" />
                <Text style={[styles.infoText, { color: '#fff' }]}>
                  Fuente: {isYouTubeVideo(selectedLesson.video_url) ? 'YouTube' : selectedLesson?.video_source_type === 'file' ? 'Archivo subido' : 'URL externa'}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* HEADER: IMAGEN DE PORTADA */}
        <View style={styles.mediaHeader}>
          <ImageBackground 
            source={{ uri: courseData?.thumbnail_url }} 
            style={styles.thumbnailImage}
            resizeMode="cover"
          >
            <LinearGradient 
              colors={['transparent', 'rgba(0,0,0,0.8)']} 
              style={styles.gradient} 
            />
            <View style={styles.thumbnailOverlay}>
              <Icon name="image" size={50} color="#fff" />
              <Text style={{color: '#fff', fontWeight: 'bold', marginTop: 10, fontSize: 12}}>
                PORTADA DEL CURSO
              </Text>
              {courseData?.thumbnail_url && (
                <Text style={{color: '#10b981', fontSize: 10, marginTop: 5}}>
                  ✓ Imagen cargada
                </Text>
              )}
            </View>
          </ImageBackground>
          
          {/* BOTÓN CERRAR */}
          <TouchableOpacity 
            style={styles.closeBtn} 
            onPress={() => navigation.goBack()}
          >
            <Icon name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* CUERPO DE LA VISTA PREVIA */}
        <View style={[styles.content, { backgroundColor: colors.background }]}>
          <View style={styles.statusBadge}>
            <View style={[styles.dot, { 
              backgroundColor: courseData?.is_published ? '#10b981' : '#f59e0b' 
            }]} />
            <Text style={styles.statusText}>
              {courseData?.is_published ? 'CURSO PUBLICADO' : 'BORRADOR'} | VISTA PREVIA ADMIN
            </Text>
          </View>

          <Text style={[styles.courseTitle, { color: colors.text }]}>
            {courseData?.title || "Sin título"}
          </Text>

          {/* CHIPS DE INFO */}
          <View style={styles.chipRow}>
            <View style={[styles.chip, { backgroundColor: colors.primary + '25' }]}>
              <Icon name="signal" size={14} color={colors.primary} />
              <Text style={[styles.chipText, { color: colors.primary }]}>
                {courseData?.level || "Nivel N/A"}
              </Text>
            </View>
            
            <View style={[styles.chip, { backgroundColor: '#334155' }]}>
              <Icon name="layers-outline" size={14} color="#cbd5e1" />
              <Text style={[styles.chipText, { color: '#cbd5e1' }]}>
                {courseData?.category || "Sin categoría"}
              </Text>
            </View>
            
            <View style={[styles.chip, { backgroundColor: '#064e3b' }]}>
              <Text style={[styles.chipText, { color: '#34d399' }]}>
                ${courseData?.price || '0'} USD
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* DESCRIPCIÓN */}
          <Text style={[styles.sectionLabel, { color: colors.text }]}>Descripción</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {courseData?.description || "Sin descripción disponible."}
          </Text>

          {/* SECCIÓN DE LECCIONES - CON REPRODUCTOR DE VIDEO */}
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 25 }]}>
            Lecciones ({courseData?.lessons?.length || 0})
          </Text>
          
          {courseData?.lessons && courseData.lessons.length > 0 ? (
            <View style={styles.lessonsContainer}>
              {courseData.lessons.map((lesson, index) => {
                const isYouTube = isYouTubeVideo(lesson.video_url);
                
                return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.lessonCard, 
                    { 
                      backgroundColor: colors.card,
                      borderLeftWidth: 4,
                      borderLeftColor: lesson.video_url ? colors.primary : colors.border
                    }
                  ]}
                  onPress={() => lesson.video_url && playVideo(lesson)}
                  disabled={!lesson.video_url}
                >
                  <View style={styles.lessonHeader}>
                    <View style={styles.lessonNumber}>
                      <Text style={[styles.lessonNumberText, { color: colors.text }]}>
                        {index + 1}
                      </Text>
                    </View>
                    <View style={styles.lessonInfo}>
                      <Text style={[styles.lessonTitle, { color: colors.text }]}>
                        {lesson.title || `Lección ${index + 1}`}
                      </Text>
                      {lesson.description && (
                        <Text style={[styles.lessonDescription, { color: colors.textSecondary }]}>
                          {lesson.description}
                        </Text>
                      )}
                    </View>
                    
                    {lesson.video_url && (
                      <Icon name="play-circle" size={28} color={colors.primary} style={styles.playIcon} />
                    )}
                  </View>
                  
                  <View style={styles.lessonDetails}>
                    <View style={styles.lessonMeta}>
                      <Icon 
                        name={lesson.video_url ? "video-check" : "video-off"} 
                        size={16} 
                        color={lesson.video_url ? "#10B981" : "#EF4444"} 
                      />
                      <Text style={[styles.lessonMetaText, { color: lesson.video_url ? "#10B981" : "#EF4444" }]}>
                        {lesson.video_url ? "Click para ver video" : "Sin video"}
                      </Text>
                      
                      {isYouTube && (
                        <View style={styles.youtubeBadge}>
                          <Icon name="youtube" size={12} color="#FF0000" />
                          <Text style={styles.youtubeBadgeText}>YouTube</Text>
                        </View>
                      )}
                      
                      {lesson.duration > 0 && (
                        <>
                          <Icon name="clock-outline" size={16} color={colors.textSecondary} style={{marginLeft: 12}} />
                          <Text style={[styles.lessonMetaText, { color: colors.textSecondary }]}>
                            {lesson.duration} min
                          </Text>
                        </>
                      )}
                    </View>
                    
                    {lesson.video_url && (
                      <TouchableOpacity 
                        style={styles.videoInfoBtn}
                        onPress={() => playVideo(lesson)}
                      >
                        <Icon name="play" size={16} color={colors.primary} />
                        <Text style={[styles.videoInfoText, { color: colors.primary }]}>
                          Reproducir
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  
                  {lesson.video_url && (
                    <View style={styles.videoPreview}>
                      <Text style={[styles.videoUrl, { color: colors.textSecondary }]} numberOfLines={1}>
                        📹 {lesson.video_url.length > 40 
                          ? `${lesson.video_url.substring(0, 40)}...` 
                          : lesson.video_url}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={[styles.noLessons, { backgroundColor: colors.card }]}>
              <Icon name="alert-circle-outline" size={24} color="#F59E0B" />
              <Text style={[styles.noLessonsText, { color: colors.text }]}>
                Este curso no tiene lecciones asignadas
              </Text>
              <Text style={[styles.noLessonsSubtext, { color: colors.textSecondary }]}>
                Agrega lecciones desde la edición del curso
              </Text>
            </View>
          )}

          {/* INFO TÉCNICA */}
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: 25 }]}>
            Información Técnica
          </Text>
          
          <View style={[styles.adminInfo, { backgroundColor: colors.card }]}>
            <Icon name="information-outline" size={22} color={colors.primary} />
            <View style={{flex: 1}}>
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>ID del curso:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {courseData?.id?.substring(0, 8) || 'N/A'}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Estado:</Text>
                <View style={[
                  styles.statusIndicator, 
                  { backgroundColor: courseData?.is_published ? '#10b98120' : '#f59e0b20' }
                ]}>
                  <Text style={[
                    styles.statusTextSmall, 
                    { color: courseData?.is_published ? '#10b981' : '#f59e0b' }
                  ]}>
                    {courseData?.is_published ? 'Publicado' : 'Borrador'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Portada:</Text>
                <View style={styles.statusIndicator}>
                  <Icon 
                    name={courseData?.thumbnail_url ? "check-circle" : "close-circle"} 
                    size={14} 
                    color={courseData?.thumbnail_url ? '#10b981' : '#ef4444'} 
                  />
                  <Text style={[
                    styles.statusTextSmall, 
                    { color: courseData?.thumbnail_url ? '#10b981' : '#ef4444' }
                  ]}>
                    {courseData?.thumbnail_url ? 'Cargada' : 'No cargada'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Lecciones con video:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {courseData?.lessons?.filter(l => l.video_url).length || 0} de {courseData?.lessons?.length || 0}
                </Text>
              </View>
              
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Creado:</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {courseData?.created_at ? new Date(courseData.created_at).toLocaleDateString('es-ES') : 'N/A'}
                </Text>
              </View>
              
              {courseData?.published_at && (
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Publicado:</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {new Date(courseData.published_at).toLocaleDateString('es-ES')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* BOTONES DE ACCIÓN */}
          <View style={styles.actionButtons}>
            <TouchableOpacity 
              style={[styles.secondaryBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => navigation.goBack()} 
            >
              <Icon name="arrow-left" size={18} color={colors.text} />
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>VOLVER</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={() => navigation.navigate('AdminTabs')} 
            >
              <Icon name="view-dashboard" size={18} color="#fff" />
              <Text style={styles.primaryBtnText}>PANEL ADMIN</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* ✅ Modal del reproductor de video */}
      {renderVideoModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  mediaHeader: { 
    width: width, 
    height: height * 0.35, 
    backgroundColor: '#000',
    position: 'relative'
  },
  thumbnailImage: { 
    width: '100%', 
    height: '100%' 
  },
  gradient: { 
    flex: 1 
  },
  thumbnailOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    justifyContent: 'center', 
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  closeBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 50,
    zIndex: 10
  },
  content: { 
    padding: 25, 
    marginTop: -25, 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30 
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#334155'
  },
  dot: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    marginRight: 8 
  },
  statusText: { 
    color: '#94a3b8', 
    fontSize: 10, 
    fontWeight: 'bold', 
    letterSpacing: 0.5 
  },
  courseTitle: { 
    fontSize: 26, 
    fontWeight: '900', 
    marginBottom: 20,
    lineHeight: 32
  },
  chipRow: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 10, 
    marginBottom: 25 
  },
  chip: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 12, 
    gap: 6 
  },
  chipText: { 
    fontSize: 13, 
    fontWeight: 'bold' 
  },
  divider: { 
    height: 1, 
    backgroundColor: '#334155', 
    marginBottom: 25, 
    opacity: 0.2 
  },
  sectionLabel: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    marginBottom: 12 
  },
  description: { 
    fontSize: 16, 
    lineHeight: 24, 
    marginBottom: 20 
  },
  lessonsContainer: {
    marginBottom: 20,
  },
  lessonCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  lessonHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  lessonNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  lessonNumberText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  lessonDescription: {
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },
  playIcon: {
    marginLeft: 10,
  },
  lessonDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  lessonMetaText: {
    fontSize: 13,
    marginLeft: 4,
    fontWeight: '500',
  },
  youtubeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.1)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
    marginLeft: 8,
  },
  youtubeBadgeText: {
    color: '#FF0000',
    fontSize: 11,
    fontWeight: '600',
  },
  videoInfoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  videoInfoText: {
    fontSize: 12,
    fontWeight: '600',
  },
  videoPreview: {
    marginTop: 8,
    padding: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: 6,
  },
  videoUrl: {
    fontSize: 11,
    fontFamily: 'monospace',
  },
  noLessons: {
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  noLessonsText: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 15,
    textAlign: 'center',
  },
  noLessonsSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
  },
  adminInfo: { 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 30 
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  primaryBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryBtn: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontWeight: '600',
    fontSize: 14,
  },
  // Estilos del modal de video
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoHeader: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 15,
    backgroundColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeVideoButton: {
    marginRight: 15,
    padding: 5,
  },
  videoTitleContainer: {
    flex: 1,
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 5,
  },
  videoSubtitle: {
    fontSize: 14,
    color: '#aaa',
  },
  videoPlayerContainer: {
    width: '100%',
    height: height * 0.35,
    backgroundColor: '#000',
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  videoDetails: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  lessonDetailTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 15,
  },
  lessonDetailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  videoInfo: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 15,
  },
});