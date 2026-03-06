import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Upload, Camera, X, Download, Share2, Loader2, Sparkles, ArrowLeft, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const TryOnModal = ({ open, onOpenChange, product }) => {
  const [step, setStep] = useState('upload'); // upload, processing, result
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [resultUrl, setResultUrl] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [progress, setProgress] = useState(0);
  const [useCamera, setUseCamera] = useState(false);
  const [showComparison, setShowComparison] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(50);
  
  const fileInputRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const handleClose = () => {
    setStep('upload');
    setSelectedImage(null);
    setPreviewUrl(null);
    setResultUrl(null);
    setJobId(null);
    setProgress(0);
    setUseCamera(false);
    setShowComparison(false);
    onOpenChange(false);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB');
        return;
      }
      
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setUseCamera(true);
      }
    } catch (error) {
      toast.error('Camera access denied or unavailable');
      console.error('Camera error:', error);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
        setSelectedImage(file);
        setPreviewUrl(URL.createObjectURL(file));
        
        // Stop camera
        const stream = video.srcObject;
        stream.getTracks().forEach(track => track.stop());
        setUseCamera(false);
      }, 'image/jpeg', 0.95);
    }
  };

  const handleTryOn = async () => {
    if (!selectedImage) {
      toast.error('Please select an image first');
      return;
    }

    setStep('processing');
    setProgress(0);

    try {
      // Upload image
      const formData = new FormData();
      formData.append('file', selectedImage);
      
      const uploadResponse = await axios.post(
        `${API_URL}/api/tryon/upload?product_id=${product.id}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      const { job_id } = uploadResponse.data;
      setJobId(job_id);

      // Poll for status
      let attempts = 0;
      const maxAttempts = 60; // 60 seconds
      
      const pollStatus = setInterval(async () => {
        attempts++;
        setProgress(Math.min((attempts / maxAttempts) * 100, 95));

        try {
          const statusResponse = await axios.get(
            `${API_URL}/api/tryon/status/${job_id}`
          );

          const { status, result_url, error } = statusResponse.data;

          if (status === 'completed') {
            clearInterval(pollStatus);
            setProgress(100);
            setResultUrl(`${API_URL}${result_url}`);
            setStep('result');
            setShowComparison(true);
            toast.success('Your virtual try-on is ready!');
          } else if (status === 'failed') {
            clearInterval(pollStatus);
            toast.error(error || 'Virtual try-on failed. Please try again.');
            setStep('upload');
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollStatus);
            toast.error('Processing took too long. Please try again.');
            setStep('upload');
          }
        } catch (error) {
          console.error('Status check error:', error);
        }
      }, 1000);

    } catch (error) {
      console.error('Try-on error:', error);
      toast.error(error.response?.data?.detail || 'Failed to process. Please try again.');
      setStep('upload');
    }
  };

  const handleDownload = async () => {
    if (resultUrl) {
      try {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shriramya-tryon-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Image downloaded!');
      } catch (error) {
        toast.error('Failed to download image');
      }
    }
  };

  const handleShare = async () => {
    if (navigator.share && resultUrl) {
      try {
        const response = await fetch(resultUrl);
        const blob = await response.blob();
        const file = new File([blob], 'tryon.png', { type: 'image/png' });
        await navigator.share({
          title: 'My Shri Ramya Virtual Try-On',
          text: 'Check out how this looks on me!',
          files: [file]
        });
      } catch (error) {
        console.log('Share failed:', error);
        toast.info('Sharing not supported on this device');
      }
    } else {
      toast.info('Sharing not supported on this device');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-heading flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-secondary" />
            Virtual Try-On
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 'upload' && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6 mt-4"
            >
              {!useCamera ? (
                <>
                  {/* Upload Area */}
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-secondary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {previewUrl ? (
                      <div className="relative">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-96 mx-auto rounded-lg shadow-luxury"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute top-2 right-2 bg-background/80 backdrop-blur"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedImage(null);
                            setPreviewUrl(null);
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
                        <div>
                          <p className="text-lg font-medium mb-2">Upload Your Photo</p>
                          <p className="text-sm text-muted-foreground">
                            For best results, use a full-body photo with good lighting
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG • Max 10MB
                        </p>
                      </div>
                    )}
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={startCamera}
                    >
                      <Camera className="h-4 w-4 mr-2" />
                      Use Camera
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleTryOn}
                      disabled={!selectedImage}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Try It On
                    </Button>
                  </div>
                </>
              ) : (
                /* Camera View */
                <div className="space-y-4">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full rounded-lg shadow-luxury"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        const stream = videoRef.current?.srcObject;
                        stream?.getTracks().forEach(track => track.stop());
                        setUseCamera(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button className="flex-1" onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-2" />
                      Capture Photo
                    </Button>
                  </div>
                </div>
              )}

              {/* Tips */}
              <div className="bg-accent/10 rounded-lg p-4 text-sm">
                <p className="font-medium mb-2">💡 Tips for best results:</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>Stand in a well-lit area with plain background</li>
                  <li>Wear fitted clothing to show your body shape</li>
                  <li>Face the camera directly with arms slightly away from body</li>
                </ul>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div
              key="processing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center space-y-6"
            >
              <div className="relative w-32 h-32 mx-auto">
                <Loader2 className="w-32 h-32 text-primary animate-spin" />
                <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-12 w-12 text-secondary animate-pulse" />
              </div>
              
              <div className="space-y-2">
                <p className="text-xl font-heading font-medium">Crafting Your Look...</p>
                <p className="text-sm text-muted-foreground font-accent italic">
                  Our AI is weaving the perfect fit for you
                </p>
              </div>

              <div className="max-w-md mx-auto">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-secondary to-accent"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-2">{Math.round(progress)}%</p>
              </div>
            </motion.div>
          )}

          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6 mt-4"
            >
              {/* Comparison Toggle */}
              <div className="flex justify-center gap-2">
                <Button
                  size="sm"
                  variant={!showComparison ? 'default' : 'outline'}
                  onClick={() => setShowComparison(false)}
                >
                  Result Only
                </Button>
                <Button
                  size="sm"
                  variant={showComparison ? 'default' : 'outline'}
                  onClick={() => setShowComparison(true)}
                >
                  Before & After
                </Button>
              </div>

              {/* Image Display */}
              {!showComparison ? (
                <div className="relative">
                  <img
                    src={resultUrl}
                    alt="Try-on result"
                    className="w-full rounded-lg shadow-luxury-lg"
                  />
                </div>
              ) : (
                /* Before/After Slider */
                <div className="relative overflow-hidden rounded-lg shadow-luxury-lg">
                  <div className="relative aspect-[3/4]">
                    {/* Before Image */}
                    <img
                      src={previewUrl}
                      alt="Before"
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                    
                    {/* After Image with clip */}
                    <div
                      className="absolute inset-0"
                      style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                    >
                      <img
                        src={resultUrl}
                        alt="After"
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Slider */}
                    <div
                      className="absolute inset-y-0 w-1 bg-white shadow-lg cursor-ew-resize"
                      style={{ left: `${sliderPosition}%` }}
                      onMouseDown={(e) => {
                        const startX = e.clientX;
                        const startPosition = sliderPosition;
                        const rect = e.currentTarget.parentElement.getBoundingClientRect();

                        const handleMouseMove = (e) => {
                          const delta = ((e.clientX - startX) / rect.width) * 100;
                          setSliderPosition(Math.max(0, Math.min(100, startPosition + delta)));
                        };

                        const handleMouseUp = () => {
                          document.removeEventListener('mousemove', handleMouseMove);
                          document.removeEventListener('mouseup', handleMouseUp);
                        };

                        document.addEventListener('mousemove', handleMouseMove);
                        document.addEventListener('mouseup', handleMouseUp);
                      }}
                    >
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2 shadow-lg">
                        <div className="flex gap-1">
                          <ArrowLeft className="h-3 w-3" />
                          <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>

                    {/* Labels */}
                    <div className="absolute top-4 left-4 bg-black/50 backdrop-blur px-3 py-1 rounded text-white text-sm">
                      Before
                    </div>
                    <div className="absolute top-4 right-4 bg-black/50 backdrop-blur px-3 py-1 rounded text-white text-sm">
                      After
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setStep('upload');
                    setSelectedImage(null);
                    setPreviewUrl(null);
                    setResultUrl(null);
                  }}
                >
                  Try Another
                </Button>
                <Button variant="outline" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default TryOnModal;
