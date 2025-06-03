
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { X, Send, Bot, User, Sparkles, ArrowUp } from "lucide-react";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [inputMessage]);

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
      <DialogContent className="max-w-4xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="relative">
              <Bot className="h-6 w-6 text-blue-600" />
              <Sparkles className="h-3 w-3 text-purple-500 absolute -top-1 -right-1" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-semibold">
              Ask Gemini about Results
            </span>
          </DialogTitle>
        </DialogHeader>

        {!assessmentId && (
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <h4 className="text-sm font-medium mb-3 text-gray-700">Select Assessments to Analyze:</h4>
            <div className="flex flex-wrap gap-2">
              {allAssessments.map(assessment => (
                <Badge
                  key={assessment.id}
                  variant={selectedAssessments.includes(assessment.id) ? "default" : "outline"}
                  className={`cursor-pointer transition-all duration-200 ${
                    selectedAssessments.includes(assessment.id) 
                      ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" 
                      : "hover:bg-gray-100 hover:border-gray-300"
                  }`}
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
              <p className="text-xs text-gray-500 mt-2">
                {selectedAssessments.length} assessment(s) selected
              </p>
            )}
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-white to-gray-50/30">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="relative inline-block">
                  <Bot className="h-16 w-16 mx-auto mb-4 text-blue-500" />
                  <Sparkles className="h-6 w-6 text-purple-500 absolute -top-1 -right-1" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">Ask me anything about the results!</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  I can help analyze performance trends, identify patterns, suggest improvements, and provide insights about your assessment data.
                </p>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer border-blue-100" 
                        onClick={() => setInputMessage("What are the overall performance trends?")}>
                    <p className="text-sm text-gray-700">📊 Analyze performance trends</p>
                  </Card>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer border-purple-100"
                        onClick={() => setInputMessage("Which students need additional support?")}>
                    <p className="text-sm text-gray-700">🎯 Identify struggling students</p>
                  </Card>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer border-green-100"
                        onClick={() => setInputMessage("How can we improve the pass rate?")}>
                    <p className="text-sm text-gray-700">💡 Improvement suggestions</p>
                  </Card>
                  <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer border-orange-100"
                        onClick={() => setInputMessage("Are there any cheating patterns?")}>
                    <p className="text-sm text-gray-700">🔍 Detect anomalies</p>
                  </Card>
                </div>
              </div>
            )}
            
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-4 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-blue-600 text-white rounded-3xl rounded-br-md' 
                    : 'bg-white border border-gray-200 rounded-3xl rounded-bl-md shadow-sm'
                } px-5 py-3 relative`}>
                  <div className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    message.type === 'user' ? 'text-white' : 'text-gray-800'
                  }`}>
                    {message.content}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-600 to-gray-700 flex items-center justify-center flex-shrink-0 shadow-sm">
                    <User className="h-4 w-4 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-white" />
                </div>
                <div className="bg-white border border-gray-200 rounded-3xl rounded-bl-md shadow-sm px-5 py-3">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">Gemini is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t bg-white p-4">
            <div className="flex gap-3 items-end max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask about assessment results..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="min-h-[48px] max-h-[120px] resize-none pr-12 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-2xl"
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  size="sm"
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                >
                  <ArrowUp className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <p className="text-xs text-gray-500 text-center mt-2">
              Press Enter to send, Shift + Enter for new line
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AskAIDialog;
