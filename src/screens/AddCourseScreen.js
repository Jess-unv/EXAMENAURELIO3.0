import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Switch,
  Modal,
  TouchableWithoutFeedback,
  Linking,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from 'expo-file-system';
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { useCourses } from "../context/CourseContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function AddCourseScreen({ navigation }) {
  const { colors } = useTheme();
  const { 
    addCourse, 
    categories, 
    levels, 
    isValidVideoUrl, 
    isYouTubeVideo,
    uploadThumbnail,
    uploadLessonVideo,
    uploadProgress 
  } = useCourses();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingLessonVideo, setUploadingLessonVideo] = useState(false);

  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("0");
  const [discountPercentage, setDiscountPercentage] = useState("0");
  const [discountPrice, setDiscountPrice] = useState(0);
  const [discountRecommendation, setDiscountRecommendation] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [durationHours, setDurationHours] = useState("10");
  const [language, setLanguage] = useState("Español");
  const [isPublished, setIsPublished] = useState(false);

  const [thumbnailUri, setThumbnailUri] = useState(null);

  const [lessons, setLessons] = useState([]);
  const [showLessonModal, setShowLessonModal] = useState(false);
  const [currentLesson, setCurrentLesson] = useState({
    title: "",
    video_url: "",
    video_file_uri: null,
    video_source_type: "url",
    description: "",
    duration: "",
  });
  const [editingLessonIndex, setEditingLessonIndex] = useState(-1);

  useEffect(() => {
    const originalPrice = parseFloat(price) || 0;
    
    if (originalPrice <= 0 || isFree) {
      setDiscountPrice(0);
      setDiscountRecommendation("");
      setDiscountPercentage("0");
      return;
    }

    let rec = "";
    if (originalPrice < 20) {
      rec = "Para precios bajos, se recomienda 10-20% de descuento";
    } else if (originalPrice < 50) {
      rec = "Para precios medios, se recomienda 20-40% de descuento";
    } else {
      rec = "Para precios altos, se recomienda 30-60% de descuento";
    }
    setDiscountRecommendation(rec);

    const perc = parseFloat(discountPercentage) || 0;
    if (perc > 0 && perc < 100) {
      const final = originalPrice * (1 - perc / 100);
      setDiscountPrice(final.toFixed(2));
    } else {
      setDiscountPrice(0);
    }
  }, [price, discountPercentage, isFree]);

  const requestPermissions = async (type = 'image') => {
    try {
      if (type === 'video') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería para seleccionar videos');
          return false;
        }
        return true;
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permiso necesario', 'Necesitamos acceso a tu galería');
          return false;
        }
        return true;
      }
    } catch (error) {
      console.error("Error en permisos:", error);
      return false;
    }
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions('image');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.7,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        setThumbnailUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error al seleccionar imagen:", error);
      Alert.alert("Error", "No se pudo seleccionar la imagen. Intenta de nuevo.");
    }
  };

  const validateForm = () => {
    if (!title.trim()) {
      Alert.alert("Error", "El título es obligatorio");
      return false;
    }

    if (!thumbnailUri) {
      Alert.alert("Error", "La imagen de portada es obligatoria");
      return false;
    }

    if (!selectedCategory) {
      Alert.alert("Error", "Selecciona una categoría");
      return false;
    }

    if (!selectedLevel) {
      Alert.alert("Error", "Selecciona un nivel");
      return false;
    }

    if (isPublished && lessons.length === 0) {
      Alert.alert("Error", "Debes agregar al menos una lección para publicar el curso");
      return false;
    }

    const originalPrice = parseFloat(price) || 0;
    if (!isFree && originalPrice > 0 && discountPercentage > 0) {
      const perc = parseFloat(discountPercentage);
      if (perc >= 100 || perc <= 0) {
        Alert.alert("Error", "El descuento debe estar entre 1% y 99%");
        return false;
      }
    }

    return true;
  };

  const handleCreateCourse = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setUploading(true);

    try {
      let thumbnailUrl = null;

      if (thumbnailUri) {
        try {
          console.log('Subiendo imagen de portada...');
          thumbnailUrl = await uploadThumbnail(thumbnailUri, `thumbnail_${Date.now()}.jpg`);
          console.log('Imagen de portada subida:', thumbnailUrl);
        } catch (error) {
          console.error('Error subiendo imagen:', error);
          Alert.alert("Error", "No se pudo subir la imagen de portada: " + error.message);
          setLoading(false);
          setUploading(false);
          return;
        }
      }

      let updatedLessons = [...lessons];
      
      if (lessons.length > 0) {
        console.log(`Procesando ${lessons.length} lecciones...`);
        
        for (let i = 0; i < lessons.length; i++) {
          const lesson = lessons[i];
          
          if (lesson.video_file_uri) {
            setUploadingLessonVideo(true);
            try {
              console.log(`Subiendo video lección ${i + 1}: ${lesson.title}...`);
              
              const videoUrl = await uploadLessonVideo(
                lesson.video_file_uri,
                `lesson_${Date.now()}_${i}_${lesson.title.replaceAll(/\s+/g, '_')}.mp4`
              );
              
              updatedLessons[i] = {
                ...lesson,
                video_url: videoUrl,
                video_file_uri: null
              };
              
              console.log(`Video lección ${i + 1} subido:`, videoUrl);
              
            } catch (error) {
              console.error(`Error subiendo video lección ${i + 1}:`, error);
              
              const shouldContinue = await new Promise(resolve => {
                Alert.alert(
                  "Error subiendo video",
                  `No se pudo subir el video de la lección "${lesson.title}". ¿Continuar sin este video?`,
                  [
                    { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
                    { text: "Continuar", onPress: () => resolve(true) }
                  ]
                );
              });
              
              if (!shouldContinue) {
                setLoading(false);
                setUploading(false);
                setUploadingLessonVideo(false);
                return;
              }
            } finally {
              setUploadingLessonVideo(false);
            }
          }
          else if (lesson.video_url && isValidVideoUrl(lesson.video_url)) {
            console.log(`Lección ${i + 1} ya tiene URL válida: ${lesson.video_url}`);
          }
          else if (!lesson.video_url) {
            console.log(`Lección ${i + 1} no tiene video asociado`);
          }
        }
      }
      
      const formattedLessons = updatedLessons.map((lesson, index) => ({
        title: lesson.title,
        description: lesson.description || null,
        video_url: lesson.video_url || null,
        duration: lesson.duration ? Number.parseInt(lesson.duration) : 0,
        order_index: lesson.order_index || index,
        is_preview: false,
        video_source_type: lesson.video_source_type || "url"
      }));

      const courseData = {
        admin_id: user.id,
        title: title.trim(),
        subtitle: subtitle.trim() || null,
        description: description.trim() || null,
        what_will_learn: "",
        price: isFree ? 0 : Number.parseFloat(price) || 0,
        discount_price: isFree ? null : discountPrice || null,
        thumbnail_url: thumbnailUrl,
        cover_url: null,
        video_url: null,
        level_id: selectedLevel,
        category_id: selectedCategory,
        duration_hours: Number.parseFloat(durationHours) || 10,
        language: language,
        is_published: isPublished,
        published_at: isPublished ? new Date().toISOString() : null,
        lessons: formattedLessons
      };

      console.log('Creando curso en Supabase...');

      const result = await addCourse(courseData);

      if (result.success) {
        Alert.alert(
          "Éxito",
          `Curso ${isPublished ? 'publicado' : 'guardado'} correctamente`,
          [
            {
              text: "Ver curso",
              onPress: () => {
                navigation.navigate("AdminPreview", {
                  courseData: result.course,
                  courseId: result.course.id
                });
              }
            },
            {
              text: "Crear otro",
              style: 'cancel',
              onPress: resetForm
            }
          ]
        );
      } else {
        throw new Error(result.error || "Error desconocido al crear el curso");
      }
    } catch (error) {
      console.error("Error al crear curso:", error);
      Alert.alert("Error", error.message || "No se pudo crear el curso. Revisa tu conexión.");
    } finally {
      setLoading(false);
      setUploading(false);
      setUploadingLessonVideo(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setDescription("");
    setIsFree(true);
    setPrice("0");
    setDiscountPercentage("0");
    setSelectedLevel(null);
    setSelectedCategory(null);
    setThumbnailUri(null);
    setIsPublished(false);
    setLessons([]);
  };

  const openLessonModal = (index = -1) => {
    if (index === -1) {
      setCurrentLesson({
        title: "",
        video_url: "",
        video_file_uri: null,
        video_source_type: "url",
        description: "",
        duration: "",
      });
      setEditingLessonIndex(-1);
    } else {
      setCurrentLesson(lessons[index]);
      setEditingLessonIndex(index);
    }
    setShowLessonModal(true);
  };

  const saveLesson = async () => {
    if (!currentLesson.title.trim()) {
      Alert.alert("Error", "La lección necesita un título");
      return;
    }

    let finalVideoUrl = currentLesson.video_url || null;

    if (currentLesson.video_source_type === "file" && currentLesson.video_file_uri) {
      setUploadingLessonVideo(true);
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(currentLesson.video_file_uri);
        
        if (fileInfo.exists) {
          const maxSize = 50 * 1024 * 1024;
          
          if (fileInfo.size > maxSize) {
            Alert.alert(
              "Archivo muy grande",
              "El video no debe exceder los 50MB. Por favor, comprime el video o usa una URL.",
              [{ text: "OK" }]
            );
            setUploadingLessonVideo(false);
            return;
          }

          finalVideoUrl = await uploadLessonVideo(
            currentLesson.video_file_uri,
            `lesson_${Date.now()}_${currentLesson.title.replaceAll(/\s+/g, '_')}.mp4`
          );
        } else {
          throw new Error("El archivo no existe");
        }
      } catch (err) {
        console.error("Error al subir video:", err);
        Alert.alert(
          "Error al subir video",
          err.message || "No se pudo subir el video. Intenta con una URL o un archivo más pequeño.",
          [{ text: "OK" }]
        );
        setUploadingLessonVideo(false);
        return;
      } finally {
        setUploadingLessonVideo(false);
      }
    } 
    else if (currentLesson.video_source_type === "url" && currentLesson.video_url.trim()) {
      if (!isValidVideoUrl(currentLesson.video_url)) {
        Alert.alert(
          "Error", 
          "URL de video inválida. Usa:\n• YouTube: https://youtube.com/watch?v=ID\n• Vimeo\n• Enlace directo a MP4"
        );
        return;
      }
      finalVideoUrl = currentLesson.video_url.trim();
    }
    
    if (!finalVideoUrl) {
      const confirm = await new Promise(resolve => {
        Alert.alert(
          "Sin video",
          "¿Deseas guardar la lección sin video? Puedes agregarlo más tarde.",
          [
            { text: "Cancelar", onPress: () => resolve(false), style: "cancel" },
            { text: "Guardar", onPress: () => resolve(true) }
          ]
        );
      });
      
      if (!confirm) return;
    }

    const lessonToSave = {
      title: currentLesson.title.trim(),
      description: currentLesson.description.trim() || null,
      video_url: finalVideoUrl,
      duration: currentLesson.duration ? Number.parseInt(currentLesson.duration) : 0,
      order_index: editingLessonIndex === -1 ? lessons.length : editingLessonIndex,
      is_preview: false,
      video_source_type: currentLesson.video_source_type || "url",
      video_file_uri: null,
    };

    const updatedLessons = [...lessons];
    if (editingLessonIndex === -1) {
      updatedLessons.push(lessonToSave);
    } else {
      updatedLessons[editingLessonIndex] = lessonToSave;
    }
    
    setLessons(updatedLessons);
    setShowLessonModal(false);
  };

  const deleteLesson = (index) => {
    Alert.alert("Eliminar lección", "¿Seguro que quieres eliminar esta lección?", [
      { text: "Cancelar" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: () => {
          setLessons(lessons.filter((_, i) => i !== index));
        },
      },
    ]);
  };

  const pickLessonVideo = async () => {
    const hasPermission = await requestPermissions('video');
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        allowsEditing: false,
        videoQuality: 0.5,
        presentationStyle: ImagePicker.UIImagePickerPresentationStyle.POPOVER,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        const videoUri = result.assets[0].uri;
        setCurrentLesson({
          ...currentLesson,
          video_file_uri: videoUri,
          video_source_type: "file",
          video_url: "",
        });
      }
    } catch (error) {
      console.error("Error al seleccionar video:", error);
      Alert.alert("Error", "No se pudo seleccionar el video. Intenta de nuevo.");
    }
  };

  const testVideo = () => {
    if (!currentLesson.video_url) return;
    
    if (isYouTubeVideo(currentLesson.video_url)) {
      Linking.openURL(currentLesson.video_url);
    } else {
      Alert.alert(
        "Test Video",
        "URL válida. Puedes guardar la lección.",
        [{ text: "OK" }]
      );
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.text,
      marginLeft: 10,
    },
    section: {
      marginBottom: 20,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.text,
      marginBottom: 10,
    },
    imagePicker: {
      height: 200,
      borderRadius: 10,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderStyle: 'dashed',
      overflow: 'hidden',
    },
    input: {
      padding: 12,
      borderRadius: 8,
      backgroundColor: colors.card,
      color: colors.text,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 10,
    },
    categoryContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    categoryButton: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      minWidth: 120,
      alignItems: 'center',
    },
    levelContainer: {
      flexDirection: 'row',
      gap: 10,
    },
    levelButton: {
      flex: 1,
      padding: 12,
      borderRadius: 8,
      borderWidth: 1,
      alignItems: 'center',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 20,
    },
    saveButton: {
      flex: 1,
      padding: 15,
      borderRadius: 8,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    publishButton: {
      flex: 2,
      padding: 15,
      borderRadius: 8,
      backgroundColor: colors.primary,
      alignItems: 'center',
    },
    switchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 15,
      paddingVertical: 10,
    },
    switchText: {
      color: colors.text,
      fontSize: 16,
    },
    progressContainer: {
      marginTop: 10,
    },
    progressText: {
      color: colors.textSecondary,
      fontSize: 12,
      marginTop: 5,
    },
    progressBar: {
      backgroundColor: colors.primary,
      height: '100%',
      borderRadius: 2,
    },
    lessonHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    lessonCard: {
      backgroundColor: colors.card,
      padding: 16,
      borderRadius: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    lessonTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    lessonInfo: {
      color: colors.textSecondary,
      fontSize: 14,
      marginBottom: 4,
    },
    lessonBadge: {
      backgroundColor: colors.primary + '20',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 4,
      alignSelf: 'flex-start',
      marginTop: 4,
    },
    lessonBadgeText: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '500',
    },
    lessonActions: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 8,
    },
    addLessonBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.primary,
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 8,
    },
    addLessonText: {
      color: '#fff',
      fontWeight: '600',
      marginLeft: 8,
    },
    modalVideoPicker: {
      height: 150,
      borderRadius: 10,
      backgroundColor: colors.card,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: colors.border,
      borderStyle: currentLesson.video_file_uri ? 'solid' : 'dashed',
      marginVertical: 10,
    },
    testButton: {
      backgroundColor: colors.primary + '20',
      padding: 8,
      borderRadius: 6,
      marginLeft: 10,
    },
    discountSection: {
      marginTop: 10,
      marginBottom: 20,
    },
    recommendationText: {
      color: colors.textSecondary,
      fontSize: 13,
      marginTop: 8,
    },
    discountInfo: {
      color: colors.success,
      fontSize: 14,
      marginTop: 8,
      fontWeight: '500',
    },
    freeSwitchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 15,
      paddingVertical: 10,
    },
    freeSwitchText: {
      color: colors.text,
      fontSize: 16,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portada del Curso *</Text>
          <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
            {thumbnailUri ? (
              <Image 
                source={{ uri: thumbnailUri }} 
                style={{ width: '100%', height: '100%', borderRadius: 8 }} 
                resizeMode="cover"
              />
            ) : (
              <>
                <Icon name="image-plus" size={40} color={colors.primary} />
                <Text style={{ color: colors.text, marginTop: 5 }}>Seleccionar imagen</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información Básica</Text>
          
          <TextInput
            placeholder="Título del curso *"
            placeholderTextColor={colors.textSecondary}
            style={styles.input}
            value={title}
            onChangeText={setTitle}
          />
          
          <TextInput
            placeholder="Descripción del curso"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { height: 80 }]}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categoría *</Text>
          <View style={styles.categoryContainer}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  { 
                    backgroundColor: selectedCategory === category.id ? colors.primary : colors.card,
                    borderColor: selectedCategory === category.id ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setSelectedCategory(category.id)}
              >
                <Icon 
                  name={category.icon || 'book'} 
                  size={20} 
                  color={selectedCategory === category.id ? '#FFF' : colors.primary} 
                />
                <Text style={{ 
                  color: selectedCategory === category.id ? '#FFF' : colors.text,
                  marginTop: 5,
                  fontSize: 12,
                }}>
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { marginTop: 15 }]}>Nivel *</Text>
          <View style={styles.levelContainer}>
            {levels.map(level => (
              <TouchableOpacity
                key={level.id}
                style={[
                  styles.levelButton,
                  { 
                    backgroundColor: selectedLevel === level.id ? colors.primary : colors.card,
                    borderColor: selectedLevel === level.id ? colors.primary : colors.border,
                  }
                ]}
                onPress={() => setSelectedLevel(level.id)}
              >
                <Text style={{ 
                  color: selectedLevel === level.id ? '#FFF' : colors.text,
                  fontWeight: '500',
                }}>
                  {level.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Precio</Text>
          
          <View style={styles.freeSwitchContainer}>
            <Text style={styles.freeSwitchText}>Curso gratuito</Text>
            <Switch
              value={isFree}
              onValueChange={(value) => {
                setIsFree(value);
                if (value) {
                  setPrice("0");
                  setDiscountPercentage("0");
                  setDiscountPrice(0);
                }
              }}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isFree ? '#FFF' : '#FFF'}
            />
          </View>

          {!isFree && (
            <>
              <TextInput
                placeholder="Precio original"
                placeholderTextColor={colors.textSecondary}
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
              />

              <View style={styles.discountSection}>
                <Text style={styles.label}>Porcentaje de descuento (opcional)</Text>
                <TextInput
                  style={styles.input}
                  value={discountPercentage}
                  onChangeText={setDiscountPercentage}
                  keyboardType="numeric"
                  placeholder="Ej: 30 (para 30%)"
                  placeholderTextColor={colors.textSecondary}
                />
                {discountRecommendation && (
                  <Text style={styles.recommendationText}>
                    {discountRecommendation}
                  </Text>
                )}
                {discountPrice > 0 && (
                  <View>
                    <Text style={styles.discountInfo}>
                      Precio original: ${parseFloat(price).toFixed(2)}
                    </Text>
                    <Text style={styles.discountInfo}>
                      Precio con descuento: ${discountPrice}
                    </Text>
                    <Text style={styles.discountInfo}>
                      Ganancia perdida: ${(parseFloat(price) - parseFloat(discountPrice)).toFixed(2)}
                    </Text>
                  </View>
                )}
              </View>
            </>
          )}
          
          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isPublished ? 'Publicar inmediatamente' : 'Guardar como borrador'}
            </Text>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={isPublished ? '#FFF' : '#FFF'}
            />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.lessonHeader}>
            <Text style={styles.sectionTitle}>Lecciones del curso ({lessons.length})</Text>
            <TouchableOpacity 
              style={styles.addLessonBtn}
              onPress={() => openLessonModal()}
            >
              <Icon name="plus" size={20} color="#fff" />
              <Text style={styles.addLessonText}>Agregar lección</Text>
            </TouchableOpacity>
          </View>

          {lessons.length === 0 ? (
            <Text style={{ color: colors.textSecondary, textAlign: 'center', marginVertical: 20 }}>
              Aún no has agregado lecciones al curso
            </Text>
          ) : (
            lessons.map((lesson, index) => (
              <View key={index} style={styles.lessonCard}>
                <Text style={styles.lessonTitle}>{lesson.title}</Text>
                {lesson.description && (
                  <Text style={styles.lessonInfo}>{lesson.description}</Text>
                )}
                {lesson.video_url && (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.lessonInfo}>
                      Video: {lesson.video_url.length > 40 
                        ? `${lesson.video_url.substring(0, 40)}...` 
                        : lesson.video_url}
                    </Text>
                    {isYouTubeVideo(lesson.video_url) && (
                      <View style={styles.lessonBadge}>
                        <Text style={styles.lessonBadgeText}>YouTube</Text>
                      </View>
                    )}
                  </View>
                )}
                {lesson.duration && lesson.duration > 0 && (
                  <Text style={styles.lessonInfo}>Duración: {lesson.duration} min</Text>
                )}

                <View style={styles.lessonActions}>
                  <TouchableOpacity onPress={() => openLessonModal(index)}>
                    <Icon name="pencil" size={22} color={colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteLesson(index)}>
                    <Icon name="delete" size={22} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {uploading && (
          <View style={[styles.section, styles.progressContainer]}>
            <Text style={styles.sectionTitle}>Subiendo archivos...</Text>
            <View style={{ 
              backgroundColor: colors.border, 
              borderRadius: 2, 
              height: 4,
              overflow: 'hidden',
            }}>
              <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {uploadProgress}% completado
            </Text>
          </View>
        )}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.saveButton}
            onPress={() => {
              setIsPublished(false);
              handleCreateCourse();
            }}
            disabled={loading || uploading}
          >
            {loading && !isPublished ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <Text style={{ color: colors.text, fontWeight: '500' }}>
                Guardar borrador
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.publishButton}
            onPress={() => {
              setIsPublished(true);
              handleCreateCourse();
            }}
            disabled={loading || uploading || lessons.length === 0}
          >
            {loading && isPublished ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={{ color: '#FFF', fontWeight: 'bold' }}>
                Publicar Curso
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      <Modal
        visible={showLessonModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLessonModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowLessonModal(false)}>
          <View style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}>
            <TouchableWithoutFeedback>
              <View style={{
                width: '90%',
                maxWidth: 400,
                backgroundColor: colors.card,
                borderRadius: 16,
                padding: 24,
                elevation: 5,
                maxHeight: '80%',
              }}>
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: 'bold',
                    color: colors.text,
                    marginBottom: 20,
                    textAlign: 'center',
                  }}>
                    {editingLessonIndex === -1 ? 'Nueva Lección' : 'Editar Lección'}
                  </Text>

                  <TextInput
                    style={styles.input}
                    placeholder="Título de la lección *"
                    placeholderTextColor={colors.textSecondary}
                    value={currentLesson.title}
                    onChangeText={(text) => setCurrentLesson({ ...currentLesson, title: text })}
                  />

                  <Text style={[styles.sectionTitle, { marginTop: 10 }]}>Video de la lección</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginVertical: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        { 
                          backgroundColor: currentLesson.video_source_type === "file" ? colors.primary + '20' : colors.card,
                          borderColor: currentLesson.video_source_type === "file" ? colors.primary : colors.border,
                          padding: 12,
                          minWidth: 110,
                        }
                      ]}
                      onPress={() => setCurrentLesson({ ...currentLesson, video_source_type: "file", video_url: "" })}
                    >
                      <Icon name="upload" size={20} color={currentLesson.video_source_type === "file" ? colors.primary : colors.text} />
                      <Text style={{ 
                        color: currentLesson.video_source_type === "file" ? colors.primary : colors.text,
                        marginTop: 5,
                        fontSize: 12,
                      }}>
                        Subir archivo
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.categoryButton,
                        { 
                          backgroundColor: currentLesson.video_source_type === "url" ? colors.primary + '20' : colors.card,
                          borderColor: currentLesson.video_source_type === "url" ? colors.primary : colors.border,
                          padding: 12,
                          minWidth: 110,
                        }
                      ]}
                      onPress={() => setCurrentLesson({ ...currentLesson, video_source_type: "url", video_file_uri: null })}
                    >
                      <Icon name="link" size={20} color={currentLesson.video_source_type === "url" ? colors.primary : colors.text} />
                      <Text style={{ 
                        color: currentLesson.video_source_type === "url" ? colors.primary : colors.text,
                        marginTop: 5,
                        fontSize: 12,
                      }}>
                        Usar URL
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {currentLesson.video_source_type === "file" ? (
                    <TouchableOpacity 
                      style={styles.modalVideoPicker}
                      onPress={pickLessonVideo}
                      disabled={uploadingLessonVideo}
                    >
                      {uploadingLessonVideo ? (
                        <>
                          <ActivityIndicator size="large" color={colors.primary} />
                          <Text style={{ color: colors.primary, marginTop: 10 }}>
                            Subiendo video...
                          </Text>
                        </>
                      ) : currentLesson.video_file_uri ? (
                        <>
                          <Icon name="video-check" size={40} color={colors.primary} />
                          <Text style={{ color: colors.primary, marginTop: 5, fontWeight: '600' }}>
                            Video seleccionado
                          </Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            Toca para cambiar
                          </Text>
                        </>
                      ) : (
                        <>
                          <Icon name="video-plus" size={40} color={colors.text} />
                          <Text style={{ color: colors.text, marginTop: 5 }}>Seleccionar video</Text>
                          <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                            Recomendado: MP4 menor a 50MB
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  ) : (
                    <>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          style={[styles.input, { flex: 1 }]}
                          placeholder="URL de video (YouTube, Vimeo o enlace directo)"
                          placeholderTextColor={colors.textSecondary}
                          value={currentLesson.video_url}
                          onChangeText={(text) => setCurrentLesson({ ...currentLesson, video_url: text })}
                        />
                        {currentLesson.video_url && (
                          <TouchableOpacity style={styles.testButton} onPress={testVideo}>
                            <Icon name="play" size={20} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                      </View>
                      <Text style={{ 
                        fontSize: 12, 
                        color: colors.textSecondary,
                        marginBottom: 10,
                        fontStyle: 'italic'
                      }}>
                        Para YouTube: https://youtube.com/watch?v=ID o https://youtu.be/ID
                      </Text>
                    </>
                  )}

                  <TextInput
                    style={styles.input}
                    placeholder="Duración en minutos (opcional)"
                    placeholderTextColor={colors.textSecondary}
                    keyboardType="number-pad"
                    value={currentLesson.duration}
                    onChangeText={(text) => setCurrentLesson({ ...currentLesson, duration: text })}
                  />

                  <TextInput
                    style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
                    placeholder="Descripción de la lección (opcional)"
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={currentLesson.description}
                    onChangeText={(text) => setCurrentLesson({ ...currentLesson, description: text })}
                  />

                  <View style={{ flexDirection: 'row', gap: 12, marginTop: 24 }}>
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: colors.border,
                        alignItems: 'center',
                      }}
                      onPress={() => setShowLessonModal(false)}
                      disabled={uploadingLessonVideo}
                    >
                      <Text style={{ color: colors.text, fontWeight: '600' }}>Cancelar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: 14,
                        borderRadius: 10,
                        backgroundColor: colors.primary,
                        alignItems: 'center',
                        opacity: uploadingLessonVideo ? 0.7 : 1,
                      }}
                      onPress={saveLesson}
                      disabled={uploadingLessonVideo}
                    >
                      {uploadingLessonVideo ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>Guardar lección</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}