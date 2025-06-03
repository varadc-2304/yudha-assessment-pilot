
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { X, Send, Bot, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

interface AskAIDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assessmentId?: string;
  assessmentName?: string;
  allAssessments?: { id: string; name: string; code: string }[];
  resultsData: any[];
}

const AskAIDialog: React.FC<AskAIDialogProps> = ({
  open,
  onOpenChange,
  assessmentId,
  assessmentName,
  allAssessments = [],
  resultsData
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [selectedAssessments, setSelectedAssessments] = useState<string[]>(
    assessmentId ? [assessmentId] : []
  );
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getFilteredResults = () => {
    if (assessmentId) {
      return resultsData;
    }
    return resultsData.filter(result => 
      selectedAssessments.includes(result.assessment_id)
    );
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const filteredResults = getFilteredResults();
    
    if (!assessmentId && selectedAssessments.length === 0) {
      toast({
        title: "Please select assessments",
        description: "You need to select at least one assessment to analyze.",
        variant: "destructive"
      });
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ask-ai-results', {
        body: {
          query: inputMessage,
          resultsData: filteredResults,
          assessmentInfo: assessmentId 
            ? { id: assessmentId, name: assessmentName }
            : selectedAssessments.map(id => {
                const assessment = allAssessments.find(a => a.id === id);
                return { id, name: assessment?.name, code: assessment?.code };
              })
        }
      });

      if (error) throw error;

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error calling AI:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleAssessmentSelection = (assessmentId: string) => {
    setSelectedAssessments(prev => 
      prev.includes(assessmentId)
        ? prev.filter(id => id !== assessmentId)
        : [...prev, assessmentId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Ask AI about Results
          </DialogTitle>
        </DialogHeader>

        {!assessmentId && (
          <div className="border-b pb-4">
            <h4 className="text-sm font-medium mb-3">Select Assessments to Analyze:</h4>
            <div className="flex flex-wrap gap-2">
              {allAssessments.map(assessment => (
                <Badge
                  key={assessment.id}
                  variant={selectedAssessments.includes(assessment.id) ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => toggleAssessmentSelection(assessment.id)}
                >
                  {assessment.name} ({assessment.code})
                  {selectedAssessments.includes(assessment.id) && (
                    <X className="h-3 w-3 ml-1" />
                  )}
                </Badge>
              ))}
            </div>
            {selectedAssessments.length > 0 && (
              <p className="text-xs text-muted-foreground mt-2">
                {selectedAssessments.length} assessment(s) selected
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-muted/20 rounded-lg">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ask me anything about the assessment results!</p>
                <p className="text-sm mt-2">
                  I can help analyze performance trends, identify patterns, and provide insights.
                </p>
              </div>
            )}
            
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <Card className={`max-w-[80%] p-3 ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-background'
                }`}>
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <p className={`text-xs mt-2 opacity-70 ${
                    message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </Card>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <Card className="p-3 bg-background">
                  <div className="flex items-center gap-2">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-muted-foreground">AI is thinking...</span>
                  </div>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="flex gap-2 mt-4">
            <Input
              placeholder="Ask about assessment results..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className="flex-1"
            />
            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || !inputMessage.trim()}
              size="icon"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AskAIDialog;
