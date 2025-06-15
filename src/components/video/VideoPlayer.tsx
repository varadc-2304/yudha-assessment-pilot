
import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from 'lucide-react';

interface VideoPlayerProps {
  videoUrl: string;
  violations: string[];
}

interface Bookmark {
  timestamp: string;
  timeInSeconds: number;
  startTimeInSeconds: number;
  description: string;
  timeRange: string;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ videoUrl, violations }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);

  // Parse violations into bookmarks with time ranges
  useEffect(() => {
    const parseBookmarks = () => {
      const parsed = violations.map((violation) => {
        // Extract timestamp like [03:10] from the violation string
        const timestampMatch = violation.match(/\[(\d{2}):(\d{2})\]/);
        if (timestampMatch) {
          const minutes = parseInt(timestampMatch[1]);
          const seconds = parseInt(timestampMatch[2]);
          const timeInSeconds = minutes * 60 + seconds;
          const startTimeInSeconds = Math.max(0, timeInSeconds - 60); // 60 seconds before, but not negative
          const description = violation.replace(/\[\d{2}:\d{2}\]\s*/, '');
          
          // Format time range
          const formatTime = (totalSeconds: number) => {
            const mins = Math.floor(totalSeconds / 60);
            const secs = Math.floor(totalSeconds % 60);
            return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
          };
          
          const timeRange = `${formatTime(startTimeInSeconds)} - ${formatTime(timeInSeconds)}`;
          
          return {
            timestamp: `${timestampMatch[1]}:${timestampMatch[2]}`,
            timeInSeconds,
            startTimeInSeconds,
            description,
            timeRange
          };
        }
        return null;
      }).filter(Boolean) as Bookmark[];
      
      // Sort by timestamp
      parsed.sort((a, b) => a.timeInSeconds - b.timeInSeconds);
      setBookmarks(parsed);
    };

    parseBookmarks();
  }, [violations]);

  // Update current time and handle video events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
      if (video.duration && isFinite(video.duration)) {
        setDuration(video.duration);
        setIsVideoLoaded(true);
      }
    };
    const handleLoadedData = () => setIsVideoLoaded(true);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('canplay', handleLoadedData);
    video.addEventListener('durationchange', updateDuration);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('canplay', handleLoadedData);
      video.removeEventListener('durationchange', updateDuration);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekTo = (time: number) => {
    const video = videoRef.current;
    if (!video || !isFinite(time)) return;

    video.currentTime = Math.max(0, Math.min(time, duration));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const progressBar = progressRef.current;
    if (!progressBar || !duration || !isFinite(duration)) return;

    const rect = progressBar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progressWidth = rect.width;
    const clickTime = (clickX / progressWidth) * duration;
    
    if (isFinite(clickTime)) {
      seekTo(clickTime);
    }
  };

  const skipForward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.min(video.currentTime + 10, duration);
  };

  const skipBackward = () => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(video.currentTime - 10, 0);
  };

  const formatTime = (time: number) => {
    if (!isFinite(time) || isNaN(time)) return '00:00';
    
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isBookmarkActive = (bookmark: Bookmark) => {
    return currentTime >= bookmark.startTimeInSeconds && currentTime <= bookmark.timeInSeconds;
  };

  const progressPercentage = duration > 0 && isFinite(duration) ? (currentTime / duration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Video Player */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full max-h-96"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          preload="metadata"
        >
          <source src={videoUrl} type="video/webm" />
          <source src={videoUrl} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
        
        {/* Custom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
          {/* Progress Bar Container */}
          <div className="mb-4 relative">
            <div 
              ref={progressRef}
              className="w-full bg-gray-600/50 rounded-full h-3 cursor-pointer hover:h-4 transition-all duration-200"
              onClick={handleProgressClick}
            >
              <div 
                className="bg-blue-500 h-full rounded-full transition-all duration-100 relative"
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
              >
                {/* Progress handle */}
                <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-blue-500 rounded-full opacity-0 hover:opacity-100 transition-opacity duration-200" />
              </div>
            </div>
            
            {/* Bookmark indicators - show range indicators */}
            {bookmarks.map((bookmark, index) => {
              if (!duration || !isFinite(duration)) return null;
              
              const startPosition = (bookmark.startTimeInSeconds / duration) * 100;
              const endPosition = (bookmark.timeInSeconds / duration) * 100;
              const width = endPosition - startPosition;
              
              return (
                <div key={index} className="absolute top-0 h-3">
                  {/* Range indicator */}
                  <div
                    className="absolute top-0 h-3 bg-red-400/60 cursor-pointer hover:bg-red-500/80 transition-colors duration-200"
                    style={{ 
                      left: `${Math.min(100, Math.max(0, startPosition))}%`,
                      width: `${Math.min(100 - startPosition, Math.max(0, width))}%`
                    }}
                    title={`${bookmark.timeRange} - ${bookmark.description}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(bookmark.startTimeInSeconds);
                    }}
                  />
                  {/* End point marker */}
                  <div
                    className="absolute top-0 w-1 h-3 bg-red-600 rounded-full cursor-pointer hover:scale-110 transition-transform duration-200"
                    style={{ left: `${Math.min(100, Math.max(0, endPosition))}%` }}
                    title={`Violation at ${bookmark.timestamp} - ${bookmark.description}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      seekTo(bookmark.startTimeInSeconds);
                    }}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Controls */}
          <div className="flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={skipBackward}
                className="text-white hover:bg-white/20"
              >
                <SkipBack className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
                disabled={!isVideoLoaded}
              >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={skipForward}
                className="text-white hover:bg-white/20"
              >
                <SkipForward className="h-4 w-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="text-sm font-medium">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>

        {/* Loading indicator */}
        {!isVideoLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white">Loading video...</div>
          </div>
        )}
      </div>

      {/* Bookmarks Panel */}
      {bookmarks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Violation Bookmarks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {bookmarks.map((bookmark, index) => (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                    isBookmarkActive(bookmark)
                      ? 'bg-red-50 border-red-200'
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => seekTo(bookmark.startTimeInSeconds)}
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="outline" 
                      className={isBookmarkActive(bookmark) ? 'bg-red-100 text-red-800' : ''}
                    >
                      {bookmark.timeRange}
                    </Badge>
                    <span className="text-sm">{bookmark.description}</span>
                  </div>
                  {isBookmarkActive(bookmark) && (
                    <Badge variant="secondary" className="text-xs">
                      Current
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoPlayer;
