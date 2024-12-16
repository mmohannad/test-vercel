// src/components/RubricGrader.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';

// SVG icons as components
const ChevronDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9l6 6 6-6"/>
  </svg>
);

const ChevronUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 15l-6-6-6 6"/>
  </svg>
);

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 6L9 17l-5-5"/>
  </svg>
);

const XIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

interface RubricError {
  rule: string;
  explanation: string;
}

interface RubricResult {
  isValid: boolean;
  promptRequirement: string;
  errors: RubricError[];
  suggestion: string;
  reasoning: string;
}

interface CriterionAnalysis {
  criterion: string;
  result: RubricResult | null;
  expanded: boolean;
  loading: boolean;
  error?: string;
}

const RubricGrader = () => {
  const [prompt, setPrompt] = useState('');
  const [criteria, setCriteria] = useState('');
  const [analyses, setAnalyses] = useState<CriterionAnalysis[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const analyzeCriteria = async () => {
    if (!prompt.trim() || !criteria.trim()) {
      setError('Please provide both the original prompt and the rubric criteria');
      return;
    }

    const criteriaList = criteria
      .split('\n')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (criteriaList.length === 0) {
      setError('No valid criteria found');
      return;
    }

    setLoading(true);
    setError('');
    
    // Initialize analyses array with loading states
    const initialAnalyses = criteriaList.map(criterion => ({
      criterion,
      result: null,
      expanded: false,
      loading: true
    }));
    setAnalyses(initialAnalyses);

    // Analyze each criterion sequentially
    for (let i = 0; i < criteriaList.length; i++) {
      try {
        const response = await fetch('/api/analyze-rubric', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            prompt: prompt.trim(),
            criterion: criteriaList[i]
          }),
        });
  
        if (!response.ok) {
          throw new Error('Failed to analyze criterion');
        }
  
        const result = await response.json();
        
        setAnalyses(prev => prev.map((analysis, index) => 
          index === i 
            ? { ...analysis, result, loading: false }
            : analysis
        ));
      } catch (err) {
        console.error(`Error analyzing criterion ${i + 1}:`, err);
        setAnalyses(prev => prev.map((analysis, index) => 
          index === i 
            ? { ...analysis, error: err instanceof Error ? err.message : 'Failed to analyze criterion', loading: false }
            : analysis
        ));
      }
    }
  
    setLoading(false);
  };

  const toggleExpanded = (index: number) => {
    setAnalyses(prev => prev.map((analysis, i) => 
      i === index 
        ? { ...analysis, expanded: !analysis.expanded }
        : analysis
    ));
  };

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Logo */}
        <div className="flex justify-center">
          <Image 
            src="/scale-logo.png" 
            alt="Scale Logo" 
            width={120}
            height={48}
            className="object-contain w-auto h-12"
            priority
          />
        </div>

        {/* Title */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold">Batch Rubric Validator</h1>
          <p className="text-lg text-gray-300">
            Validate multiple rubric criteria against the original prompt.
            Enter each criterion on a new line.
          </p>
        </div>

        {/* Input Section */}
        <div className="bg-gray-900 rounded-lg p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Original Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter the original prompt that the rubric is based on..."
              className="w-full h-32 bg-gray-800 text-white rounded-lg p-4 border-none focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">
              Rubric Criteria (one per line)
            </label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              placeholder="Enter each rubric criterion on a new line..."
              className="w-full h-40 bg-gray-800 text-white rounded-lg p-4 border-none focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
            />
          </div>
          
          <div>
            <button
              onClick={analyzeCriteria}
              disabled={loading}
              className={`w-full bg-purple-600 hover:bg-purple-700 text-white py-4 rounded-lg flex items-center justify-center transition-colors ${
                loading ? 'opacity-75 cursor-not-allowed' : ''
              }`}
            >
              {loading ? (
                <div className="flex items-center">
                  <svg 
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Analyzing Criteria...
                </div>
              ) : (
                'Analyze All Criteria'
              )}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-500 text-center">
            {error}
          </div>
        )}
        
        {/* Results Section */}
        {analyses.length > 0 && (
          <div className="space-y-4">
            {analyses.map((analysis, index) => (
              <div key={index} className="bg-gray-900 rounded-lg overflow-hidden">
                <div 
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-800"
                  onClick={() => toggleExpanded(index)}
                >
                  <div className="flex items-center space-x-4">
                    {analysis.loading ? (
                      <div className="w-6 h-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : analysis.result ? (
                      analysis.result.isValid ? (
                        <span className="text-green-500"><CheckIcon /></span>
                      ) : (
                        <span className="text-red-500"><XIcon /></span>
                      )
                    ) : (
                      <span className="text-red-500"><XIcon /></span>
                    )}
                    <span className="text-sm font-medium truncate">
                      {analysis.criterion}
                    </span>
                  </div>
                  <span className="text-gray-400">
                    {analysis.expanded ? <ChevronUp /> : <ChevronDown />}
                  </span>
                </div>

                {analysis.expanded && analysis.result && (
                  <div className="p-4 border-t border-gray-800 space-y-4">
                    <div>
                      <h3 className="text-sm font-semibold mb-1">Prompt Requirement:</h3>
                      <p className="text-gray-300 text-sm">{analysis.result.promptRequirement}</p>
                    </div>

                    {analysis.result.errors && analysis.result.errors.length > 0 && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Issues Found:</h3>
                        <ul className="list-disc pl-5 space-y-1">
                          {analysis.result.errors.map((error, errorIndex) => (
                            <li key={errorIndex} className="text-red-400 text-sm">
                              <span className="font-medium">{error.rule}:</span> {error.explanation}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {analysis.result.suggestion && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Suggested Improvement:</h3>
                        <p className="text-green-400 text-sm">{analysis.result.suggestion}</p>
                      </div>
                    )}

                    {analysis.result.reasoning && (
                      <div>
                        <h3 className="text-sm font-semibold mb-1">Reasoning:</h3>
                        <p className="text-gray-300 text-sm">{analysis.result.reasoning}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RubricGrader;