
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Sparkles } from 'lucide-react';

interface GeneratedCodingQuestion {
  title: string;
  description: string;
  solutionTemplates: {
    c: string;
    cpp: string;
    java: string;
    python: string;
  };
  examples: Array<{
    input: string;
    output: string;
    explanation: string;
  }>;
  testCases: {
    visible: Array<{
      input: string;
      output: string;
      marks: number;
    }>;
    hidden: Array<{
      input: string;
      output: string;
      marks: number;
    }>;
  };
}

interface AICodingQuestionGeneratorProps {
  onQuestionGenerated: (question: GeneratedCodingQuestion) => void;
}

const AICodingQuestionGenerator: React.FC<AICodingQuestionGeneratorProps> = ({ onQuestionGenerated }) => {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast({
        title: "Error",
        description: "Please enter a topic",
        variant: "destructive"
      });
      return;
    }

    if (!difficulty) {
      toast({
        title: "Error",
        description: "Please select a difficulty level",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-coding-question', {
        body: { topic: topic.trim(), difficulty }
      });

      if (error) {
        throw error;
      }

      if (data && data.title) {
        onQuestionGenerated(data);
        setIsOpen(false);
        setTopic('');
        setDifficulty('');
        toast({
          title: "Success",
          description: "Coding question generated successfully! Review and modify as needed."
        });
      } else {
        throw new Error('Invalid response from AI service');
      }
    } catch (error: any) {
      console.error('Error generating coding question:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate coding question. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="mb-4">
          <Sparkles className="h-4 w-4 mr-2" />
          Generate with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Coding Question with AI</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="topic">Topic</Label>
            <Input
              id="topic"
              placeholder="e.g., Arrays, Dynamic Programming, Trees, Sorting..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={difficulty} onValueChange={setDifficulty} disabled={isGenerating}>
              <SelectTrigger>
                <SelectValue placeholder="Select difficulty level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim() || !difficulty}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate Question
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AICodingQuestionGenerator;
