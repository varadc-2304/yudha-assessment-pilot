import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus } from 'lucide-react';

interface AssessmentConstraint {
  id?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  question_type: 'mcq' | 'coding';
  number_of_questions: number;
}

interface AssessmentConstraintsProps {
  constraints: AssessmentConstraint[];
  onChange: (constraints: AssessmentConstraint[]) => void;
  disabled?: boolean;
}

const AssessmentConstraints: React.FC<AssessmentConstraintsProps> = ({
  constraints,
  onChange,
  disabled = false
}) => {
  const [newConstraint, setNewConstraint] = useState<AssessmentConstraint>({
    topic: '',
    difficulty: 'easy',
    question_type: 'mcq',
    number_of_questions: 1
  });

  const addConstraint = () => {
    if (!newConstraint.topic.trim() || newConstraint.number_of_questions < 1) {
      return;
    }

    const constraintToAdd = {
      ...newConstraint,
      id: `temp-${Date.now()}`
    };

    onChange([...constraints, constraintToAdd]);
    setNewConstraint({
      topic: '',
      difficulty: 'easy',
      question_type: 'mcq',
      number_of_questions: 1
    });
  };

  const removeConstraint = (index: number) => {
    const updatedConstraints = constraints.filter((_, i) => i !== index);
    onChange(updatedConstraints);
  };

  const updateConstraint = (index: number, field: keyof AssessmentConstraint, value: any) => {
    const updatedConstraints = [...constraints];
    updatedConstraints[index] = { ...updatedConstraints[index], [field]: value };
    onChange(updatedConstraints);
  };

  if (disabled) {
    return null;
  }

  return (
    <div className="space-y-4">
      <Label className="text-lg font-semibold">Assessment Constraints</Label>
      
      {/* Existing Constraints */}
      {constraints.map((constraint, index) => (
        <Card key={constraint.id || index} className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor={`topic-${index}`}>Topic</Label>
              <Input
                id={`topic-${index}`}
                value={constraint.topic}
                onChange={(e) => updateConstraint(index, 'topic', e.target.value)}
                placeholder="e.g., Arrays, Sorting"
              />
            </div>
            
            <div>
              <Label htmlFor={`difficulty-${index}`}>Difficulty</Label>
              <Select
                value={constraint.difficulty}
                onValueChange={(value) => updateConstraint(index, 'difficulty', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor={`type-${index}`}>Question Type</Label>
              <Select
                value={constraint.question_type}
                onValueChange={(value) => updateConstraint(index, 'question_type', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor={`count-${index}`}>No. of Questions</Label>
              <Input
                id={`count-${index}`}
                type="number"
                min="1"
                value={constraint.number_of_questions}
                onChange={(e) => updateConstraint(index, 'number_of_questions', parseInt(e.target.value) || 1)}
              />
            </div>
            
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => removeConstraint(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      ))}

      {/* Add New Constraint */}
      <Card className="p-4 border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Add New Constraint</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <Label htmlFor="new-topic">Topic</Label>
              <Input
                id="new-topic"
                value={newConstraint.topic}
                onChange={(e) => setNewConstraint({ ...newConstraint, topic: e.target.value })}
                placeholder="e.g., Arrays, Sorting"
              />
            </div>
            
            <div>
              <Label htmlFor="new-difficulty">Difficulty</Label>
              <Select
                value={newConstraint.difficulty}
                onValueChange={(value: 'easy' | 'medium' | 'hard') => 
                  setNewConstraint({ ...newConstraint, difficulty: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="new-type">Question Type</Label>
              <Select
                value={newConstraint.question_type}
                onValueChange={(value: 'mcq' | 'coding') => 
                  setNewConstraint({ ...newConstraint, question_type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">MCQ</SelectItem>
                  <SelectItem value="coding">Coding</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="new-count">No. of Questions</Label>
              <Input
                id="new-count"
                type="number"
                min="1"
                value={newConstraint.number_of_questions}
                onChange={(e) => setNewConstraint({ 
                  ...newConstraint, 
                  number_of_questions: parseInt(e.target.value) || 1 
                })}
              />
            </div>
            
            <Button
              type="button"
              onClick={addConstraint}
              disabled={!newConstraint.topic.trim() || newConstraint.number_of_questions < 1}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssessmentConstraints;
