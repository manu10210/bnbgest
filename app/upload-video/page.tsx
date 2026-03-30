'use client';

import { useState, useRef } from 'react';
import { Upload, Video, CheckCircle, AlertCircle, Camera, Image, X, Loader } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function UploadVideoPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [videoTitle, setVideoTitle] = useState('');
  const [videoCategory, setVideoCategory] = useState('equipement');
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'equipement', label: '🔧 Équipement', icon: '🔧' },
    { value: 'check-in', label: '🔑 Check-in', icon: '🔑' },
    { value: 'check-out', label: '🚪 Check-out', icon: '🚪' },
    { value: 'wifi', label: '📶 WiFi', icon: '📶' },
    { value: 'heating', label: '🌡️ Chauffage', icon: '🌡️' },
    { value: 'kitchen', label: '🍳 Cuisine', icon: '🍳' },
    { value: 'bathroom', label: '🚿 Salle de bain', icon: '🚿' },
    { value: 'other', label: '📋 Autre', icon: '📋' }
  ];

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Vérifier que c'est bien une vidéo
      if (!file.type.startsWith('video/')) {
        setUploadError('Veuillez sélectionner un fichier vidéo');
        return;
      }

      // Vérifier la taille (max 100MB)
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        setUploadError('La vidéo est trop volumineuse (max 100MB)');
        return;
      }

      setSelectedFile(file);
      setUploadError('');
      
      // Générer un aperçu
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      
      // Générer un titre par défaut basé sur le nom du fichier
      if (!videoTitle) {
        const defaultTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setVideoTitle(defaultTitle);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !videoTitle.trim()) {
      setUploadError('Veuillez sélectionner une vidéo et entrer un titre');
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', selectedFile);
      formData.append('title', videoTitle.trim());
      formData.append('category', videoCategory);
      formData.append('uploadedFrom', 'mobile');
      formData.append('timestamp', new Date().toISOString());

      // Simuler la progression
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fetch('/api/upload-video', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erreur lors de l\'upload');
      }

      const result = await response.json();
      console.log('Upload success:', result);

      setUploadSuccess(true);
      
      // Réinitialiser après 3 secondes
      setTimeout(() => {
        setSelectedFile(null);
        setPreviewUrl('');
        setVideoTitle('');
        setVideoCategory('equipement');
        setUploadSuccess(false);
        setUploadProgress(0);
        
        // Réinitialiser les deux inputs
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        const cameraInput = document.getElementById('video-camera') as HTMLInputElement;
        if (cameraInput) {
          cameraInput.value = '';
        }
      }, 3000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(error instanceof Error ? error.message : 'Erreur lors de l\'upload');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setPreviewUrl('');
    setVideoTitle('');
    setUploadError('');
    setUploadProgress(0);
    
    // Réinitialiser les deux inputs
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    const cameraInput = document.getElementById('video-camera') as HTMLInputElement;
    if (cameraInput) {
      cameraInput.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="max-w-2xl mx-auto pt-8 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
            <Video className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            Upload Vidéo
          </h1>
          <p className="text-white/90 text-lg">
            Téléchargez vos guides vidéo d'équipements
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-2xl p-6 md:p-8"
        >
          <AnimatePresence mode="wait">
            {uploadSuccess ? (
              // Success State
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center py-12"
              >
                <div className="inline-flex items-center justify-center w-24 h-24 bg-green-100 rounded-full mb-6">
                  <CheckCircle className="w-12 h-12 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Vidéo uploadée !
                </h2>
                <p className="text-gray-600 mb-6">
                  Votre vidéo a été téléchargée avec succès
                </p>
                <div className="inline-block animate-spin">
                  <Loader className="w-6 h-6 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Préparation pour une nouvelle vidéo...
                </p>
              </motion.div>
            ) : (
              // Upload Form
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* File Input */}
                {!selectedFile ? (
                  <div className="mb-6">
                    <div className="border-2 border-dashed border-indigo-300 rounded-2xl p-8 md:p-12 text-center">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-full mb-4">
                        <Upload className="w-8 h-8 text-indigo-600" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        Sélectionner une vidéo
                      </h3>
                      <p className="text-gray-600 mb-6">
                        Choisissez depuis votre galerie ou filmez directement
                      </p>
                      
                      {/* Boutons Galerie et Caméra */}
                      <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('video-gallery') as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4 rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Image className="w-5 h-5" />
                            <span className="font-semibold">Galerie</span>
                          </div>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.getElementById('video-camera') as HTMLInputElement;
                            if (input) input.click();
                          }}
                          className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-xl active:scale-95"
                        >
                          <div className="flex items-center justify-center gap-2">
                            <Camera className="w-5 h-5" />
                            <span className="font-semibold">Caméra</span>
                          </div>
                        </button>
                      </div>
                      
                      <p className="text-xs text-gray-400">
                        Max 100MB • MP4, MOV, AVI
                      </p>
                    </div>
                    
                    {/* Input pour galerie (sans capture) */}
                    <input
                      ref={fileInputRef}
                      id="video-gallery"
                      type="file"
                      accept="video/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    
                    {/* Input pour caméra (avec capture) */}
                    <input
                      id="video-camera"
                      type="file"
                      accept="video/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="mb-6 space-y-4">
                    {/* Video Preview */}
                    <div className="relative rounded-2xl overflow-hidden bg-black">
                      <video
                        src={previewUrl}
                        controls
                        className="w-full max-h-64 object-contain"
                      />
                      <button
                        onClick={handleCancel}
                        className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Video Info */}
                    <div className="bg-gray-50 rounded-xl p-4">
                      <div className="flex items-center gap-3 text-sm text-gray-600">
                        <Video className="w-4 h-4" />
                        <span className="font-medium truncate">{selectedFile.name}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                      </div>
                    </div>

                    {/* Title Input */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Titre de la vidéo *
                      </label>
                      <input
                        type="text"
                        value={videoTitle}
                        onChange={(e) => setVideoTitle(e.target.value)}
                        placeholder="Ex: Comment utiliser le lave-vaisselle"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
                      />
                    </div>

                    {/* Category Select */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Catégorie
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {categories.map((cat) => (
                          <button
                            key={cat.value}
                            onClick={() => setVideoCategory(cat.value)}
                            className={`p-3 rounded-xl border-2 transition-all ${
                              videoCategory === cat.value
                                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            <div className="text-2xl mb-1">{cat.icon}</div>
                            <div className="text-xs font-medium truncate">
                              {cat.label.split(' ')[1]}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Upload en cours...</span>
                          <span className="text-indigo-600 font-medium">{uploadProgress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          />
                        </div>
                      </div>
                    )}

                    {/* Error Message */}
                    {uploadError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl"
                      >
                        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-red-700">{uploadError}</p>
                      </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={handleCancel}
                        disabled={uploading}
                        className="flex-1 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium disabled:opacity-50"
                      >
                        Annuler
                      </button>
                      <button
                        onClick={handleUpload}
                        disabled={uploading || !videoTitle.trim()}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {uploading ? (
                          <>
                            <Loader className="w-5 h-5 animate-spin" />
                            <span>Upload...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="w-5 h-5" />
                            <span>Télécharger</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-6 text-white/80 text-sm"
        >
          <p>🔒 Vos vidéos sont stockées en toute sécurité</p>
          <p className="mt-2">💡 Astuce: Filmez en mode paysage pour une meilleure qualité</p>
        </motion.div>
      </div>
    </div>
  );
}
