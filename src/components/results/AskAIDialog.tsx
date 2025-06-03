
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Send, Bot, User, Sparkles, ArrowUp, CheckCircle } from "lucide-react";
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

  const formatAIResponse = (text: string) => {
    // Replace markdown-style formatting with proper HTML
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/### (.*?)(\n|$)/g, '<h3 class="text-lg font-semibold mt-4 mb-2 text-gray-800">$1</h3>')
      .replace(/## (.*?)(\n|$)/g, '<h2 class="text-xl font-semibold mt-4 mb-2 text-gray-800">$1</h2>')
      .replace(/# (.*?)(\n|$)/g, '<h1 class="text-2xl font-bold mt-4 mb-2 text-gray-800">$1</h1>')
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
      .replace(/- (.*?)(<br>|$)/g, '<li class="ml-4">• $1</li>')
      .replace(/(<li.*?<\/li>)/g, '<ul class="space-y-1 my-2">$1</ul>');
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

  const handleAssessmentSelect = (value: string) => {
    if (value === "all") {
      setSelectedAssessments(allAssessments.map(a => a.id));
    } else if (!selectedAssessments.includes(value)) {
      setSelectedAssessments(prev => [...prev, value]);
    }
  };

  const removeAssessment = (assessmentId: string) => {
    setSelectedAssessments(prev => prev.filter(id => id !== assessmentId));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0 gap-0 bg-white">
        <DialogHeader className="px-6 py-4 border-b border-gray-200 bg-gray-50/50">
          <DialogTitle className="flex items-center gap-3 text-xl font-semibold text-gray-900">
            <div className="relative">
              <Bot className="h-6 w-6 text-primary" />
              <Sparkles className="h-3 w-3 text-primary absolute -top-1 -right-1" />
            </div>
            AI Assistant
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            Ask questions about your assessment results and get AI-powered insights
          </DialogDescription>
        </DialogHeader>

        {!assessmentId && (
          <div className="px-6 py-4 border-b border-gray-200 bg-white">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">Select Assessments:</h4>
              <Select onValueChange={handleAssessmentSelect}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose assessments to analyze" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-gray-200 shadow-lg z-50">
                  <SelectItem value="all" className="hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Select All Assessments
                    </span>
                  </SelectItem>
                  {allAssessments.map(assessment => (
                    <SelectItem 
                      key={assessment.id} 
                      value={assessment.id}
                      className="hover:bg-gray-50"
                    >
                      {assessment.name} ({assessment.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {selectedAssessments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedAssessments.map(id => {
                    const assessment = allAssessments.find(a => a.id === id);
                    return (
                      <Badge
                        key={id}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 px-3 py-1"
                      >
                        {assessment?.name} ({assessment?.code})
                        <X 
                          className="h-3 w-3 ml-2 cursor-pointer hover:text-red-600" 
                          onClick={() => removeAssessment(id)}
                        />
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-hidden flex flex-col bg-gray-50/30">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="relative inline-block mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <Bot className="h-8 w-8 text-primary" />
                  </div>
                  <Sparkles className="h-4 w-4 text-primary absolute -top-1 -right-1" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">How can I help you today?</h3>
                <p className="text-gray-600 max-w-md mx-auto mb-8">
                  I can analyze your assessment data, identify trends, and provide insights to help improve performance.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                  <Card 
                    className="p-4 hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-primary/30 bg-white" 
                    onClick={() => setInputMessage("What are the overall performance trends?")}
                  >
                    <p className="text-sm text-gray-700 font-medium">📊 Analyze performance trends</p>
                  </Card>
                  <Card 
                    className="p-4 hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-primary/30 bg-white"
                    onClick={() => setInputMessage("Which students need additional support?")}
                  >
                    <p className="text-sm text-gray-700 font-medium">🎯 Identify struggling students</p>
                  </Card>
                  <Card 
                    className="p-4 hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-primary/30 bg-white"
                    onClick={() => setInputMessage("How can we improve the pass rate?")}
                  >
                    <p className="text-sm text-gray-700 font-medium">💡 Improvement suggestions</p>
                  </Card>
                  <Card 
                    className="p-4 hover:shadow-md transition-all cursor-pointer border border-gray-200 hover:border-primary/30 bg-white"
                    onClick={() => setInputMessage("Are there any unusual patterns in the results?")}
                  >
                    <p className="text-sm text-gray-700 font-medium">🔍 Detect patterns</p>
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
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 border border-primary/20">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                
                <div className={`max-w-[80%] ${
                  message.type === 'user' 
                    ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md shadow-sm' 
                    : 'bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm'
                } px-5 py-4`}>
                  <div className={`text-sm leading-relaxed ${
                    message.type === 'user' ? 'text-primary-foreground' : 'text-gray-800'
                  }`}>
                    {message.type === 'ai' ? (
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: formatAIResponse(message.content) 
                        }}
                        className="prose prose-sm max-w-none"
                      />
                    ) : (
                      <div className="whitespace-pre-wrap">{message.content}</div>
                    )}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.type === 'user' ? 'text-primary-foreground/70' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>

                {message.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0 border border-gray-200">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-4 justify-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md shadow-sm px-5 py-4">
                  <div className="flex items-center gap-3">
                    <LoadingSpinner size="sm" />
                    <span className="text-sm text-gray-600">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-200 bg-white p-4">
            <div className="flex gap-3 items-end max-w-4xl mx-auto">
              <div className="flex-1 relative">
                <Textarea
                  ref={textareaRef}
                  placeholder="Ask about your assessment results..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="min-h-[52px] max-h-[120px] resize-none pr-12 border-gray-300 focus:border-primary focus:ring-primary rounded-xl shadow-sm"
                  rows={1}
                />
                <Button 
                  onClick={handleSendMessage} 
                  disabled={isLoading || !inputMessage.trim()}
                  size="sm"
                  className="absolute right-2 bottom-2 h-8 w-8 p-0 rounded-full bg-primary hover:bg-primary/90 disabled:bg-gray-300 shadow-sm"
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
