import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  Switch,
  ScrollView,
  ActivityIndicator,
  Platform,
  SafeAreaView
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';

// For Android Emulator -> 10.0.2.2
// For iOS Simulator -> 127.0.0.1 or localhost
// Using your Wi-Fi Local IP address for physical device testing:
const BACKEND_URL = 'http://10.225.188.182:5000/predict';

export default function App() {
  const [selectedImage, setSelectedImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isAiMode, setIsAiMode] = useState(false);
  const [result, setResult] = useState(null);
  const [confidence, setConfidence] = useState(null);
  const [medicinalDetails, setMedicinalDetails] = useState(null);
  const [error, setError] = useState(null);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        resetResults();
      }
    } catch (err) {
      setError("Failed to pick image: " + err.message);
    }
  };

  const takePhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (permissionResult.granted === false) {
        setError("Camera permission is required to take photos!");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 1,
      });

      if (!result.canceled) {
        setSelectedImage(result.assets[0]);
        resetResults();
      }
    } catch (err) {
      setError("Failed to take photo: " + err.message);
    }
  };

  const resetResults = () => {
    setResult(null);
    setConfidence(null);
    setMedicinalDetails(null);
    setError(null);
  };

  const resetForm = () => {
    setSelectedImage(null);
    resetResults();
  };

  const handlePredict = async () => {
    if (!selectedImage) return;

    setIsLoading(true);
    resetResults();

    try {
      // Create form data
      const formData = new FormData();
      
      const fileUri = selectedImage.uri;
      const fileName = fileUri.split('/').pop();
      const match = /\.(\w+)$/.exec(fileName);
      const type = match ? `image/${match[1]}` : `image`;

      formData.append('image', { uri: fileUri, name: fileName, type });
      formData.append('aiMode', isAiMode.toString());

      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || 'Failed to analyze image');
      }

      setResult(data.prediction);

      if (data.confidence !== undefined) {
        setConfidence(data.confidence);
      }

      if (data.medicinalDetails) {
        setMedicinalDetails(data.medicinalDetails);
      }
    } catch (err) {
      setError(err.message || 'An error occurred while connecting to the server.\nAre you running on a physical device? Make sure to change BACKEND_URL to your computer\'s local IP address.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Plant Identifier</Text>
          <Text style={styles.subtitle}>Discover medicinal plants using PSO optimization technology.</Text>
        </View>

        {!selectedImage ? (
          <View style={styles.uploadSection}>
            <View style={styles.toggleContainer}>
              <Text style={[styles.toggleLabel, !isAiMode && styles.activeLabel]}>Local Model</Text>
              <Switch
                trackColor={{ false: '#d1d5db', true: '#ccecf2' }}
                thumbColor={isAiMode ? '#0ea5e9' : '#10b981'}
                ios_backgroundColor="#d1d5db"
                onValueChange={() => setIsAiMode(!isAiMode)}
                value={isAiMode}
                style={styles.switch}
              />
              <Text style={[styles.toggleLabel, isAiMode && styles.activeAiLabel]}>Gemini Vision</Text>
            </View>

            <TouchableOpacity style={styles.dropzone} onPress={pickImage}>
              <Text style={styles.dropzoneIcon}>📁</Text>
              <Text style={styles.dropzoneText}>
                <Text style={styles.textPrimary}>Choose from Gallery</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropzoneCamera} onPress={takePhoto}>
              <Text style={styles.dropzoneIcon}>📷</Text>
              <Text style={styles.dropzoneText}>
                <Text style={styles.textPrimary}>Take a Photo</Text>
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewContainer}>
            <Image source={{ uri: selectedImage.uri }} style={styles.imagePreview} />
            
            {isLoading ? (
              <View style={styles.loadingState}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Analyzing plant characteristics...</Text>
              </View>
            ) : result ? (
              <View style={styles.resultContainer}>
                {confidence !== null && confidence < 0.50 ? (
                  <View style={[styles.resultCard, styles.errorCard]}>
                    <Text style={styles.errorTitle}>Unrecognized Image</Text>
                    <Text style={styles.errorText}>
                      This doesn't look like a medicinal plant we recognize, or the image quality is too low.
                    </Text>
                    
                    <View style={styles.confidenceContainer}>
                      <View style={styles.confidenceHeader}>
                        <Text style={styles.confidenceLabel}>Model Confidence</Text>
                        <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${confidence * 100}%`, backgroundColor: '#ef4444' }]} />
                      </View>
                    </View>

                    <TouchableOpacity style={styles.btnSecondary} onPress={resetForm}>
                      <Text style={styles.btnSecondaryText}>Try Another Image</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={styles.resultCard}>
                      <Text style={styles.resultTitle}>Identified Plant</Text>
                      <Text style={styles.resultPlant}>{result.replace(/_/g, ' ')}</Text>
                      
                      {medicinalDetails?.scientific_name && (
                        <Text style={styles.scientificName}>
                          {medicinalDetails.scientific_name}
                        </Text>
                      )}

                      {confidence !== null && (
                        <View style={styles.confidenceContainer}>
                          <View style={styles.confidenceHeader}>
                            <Text style={styles.confidenceLabel}>Model Confidence</Text>
                            <Text style={styles.confidenceValue}>{Math.round(confidence * 100)}%</Text>
                          </View>
                          <View style={styles.progressBarBg}>
                            <View style={[styles.progressBarFill, { width: `${confidence * 100}%`, backgroundColor: '#10b981' }]} />
                          </View>
                        </View>
                      )}
                    </View>

                    {medicinalDetails && (
                      <View style={styles.detailsGrid}>
                        <View style={[styles.detailCard, styles.usesCard]}>
                          <Text style={styles.detailCardTitle}>🌿 Medicinal Uses</Text>
                          {medicinalDetails.uses.map((use, idx) => (
                            <Text key={idx} style={styles.listItem}>• {use}</Text>
                          ))}
                        </View>

                        <View style={[styles.detailCard, styles.diseasesCard]}>
                          <Text style={styles.detailCardTitle}>🛡️ Treatable Diseases</Text>
                          <View style={styles.pillContainer}>
                            {medicinalDetails.diseases.map((disease, idx) => (
                              <View key={idx} style={styles.diseasePill}>
                                <Text style={styles.diseasePillText}>{disease}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      </View>
                    )}
                  </>
                )}
                
                {result && (
                  <TouchableOpacity style={styles.btnSecondaryOutline} onPress={resetForm}>
                    <Text style={styles.btnSecondaryOutlineText}>Scan Another Plant</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={styles.actionButtons}>
                <TouchableOpacity style={styles.btnSecondary} onPress={resetForm}>
                  <Text style={styles.btnSecondaryText}>Choose Different Image</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={handlePredict}>
                  <Text style={styles.btnPrimaryText}>Analyze Image</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {error && (
          <View style={styles.errorMessage}>
            <Text style={styles.errorTextMsg}>{error}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  container: {
    flexGrow: 1,
    padding: 20,
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 40 : 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
    width: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  uploadSection: {
    width: '100%',
    alignItems: 'center',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    paddingHorizontal: 8,
  },
  activeLabel: {
    color: '#10b981',
  },
  activeAiLabel: {
    color: '#0ea5e9',
  },
  switch: {
    marginHorizontal: 10,
  },
  dropzone: {
    width: '100%',
    padding: 30,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    borderStyle: 'dashed',
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dropzoneCamera: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropzoneIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  dropzoneText: {
    color: '#475569',
    fontSize: 16,
    textAlign: 'center',
  },
  textPrimary: {
    color: '#10b981',
    fontWeight: '600',
  },
  previewContainer: {
    width: '100%',
    alignItems: 'center',
  },
  imagePreview: {
    width: '100%',
    height: 300,
    borderRadius: 16,
    marginBottom: 24,
    resizeMode: 'cover',
  },
  actionButtons: {
    width: '100%',
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 8,
  },
  btnPrimaryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondary: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  btnSecondaryText: {
    color: '#475569',
    fontSize: 16,
    fontWeight: '600',
  },
  btnSecondaryOutline: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  btnSecondaryOutlineText: {
    color: '#64748b',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingState: {
    alignItems: 'center',
    marginVertical: 30,
  },
  loadingText: {
    color: '#10b981',
    fontWeight: '500',
    marginTop: 12,
    fontSize: 16,
  },
  resultContainer: {
    width: '100%',
  },
  resultCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  errorCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  errorText: {
    color: '#64748b',
    marginTop: 8,
    lineHeight: 22,
  },
  resultTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  resultPlant: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  scientificName: {
    fontStyle: 'italic',
    color: '#64748b',
    fontSize: 16,
    marginTop: 4,
  },
  confidenceContainer: {
    marginTop: 20,
  },
  confidenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  confidenceValue: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600',
  },
  progressBarBg: {
    width: '100%',
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  detailsGrid: {
    gap: 16,
  },
  detailCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  detailCardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  listItem: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 8,
    lineHeight: 22,
  },
  pillContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  diseasePill: {
    backgroundColor: '#fee2e2',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  diseasePillText: {
    color: '#b91c1c',
    fontSize: 14,
    fontWeight: '500',
  },
  errorMessage: {
    backgroundColor: '#fef2f2',
    padding: 16,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
    marginTop: 20,
    width: '100%',
  },
  errorTextMsg: {
    color: '#b91c1c',
    lineHeight: 22,
  },
});
