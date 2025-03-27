import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Star,
  Users,
  TrendingUp,
  Brain,
  FileText
} from 'lucide-react';

export default function BusinessPlan() {
  const navigate = useNavigate();
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [initiatives, setInitiatives] = useState({
    gpt4: false,
    api: false,
    dataCenter: false,
    sso: false,
    aiModels: false
  });

  const handleInitiativeChange = (key: keyof typeof initiatives) => {
    setInitiatives(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleCardClick = (type: string) => {
    if (selectedCard === type) {
      navigate(`/swot/${type}`);
    } else {
      setSelectedCard(type);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-semibold text-gray-800">
          DocuMind AI
          <br />
          Series A Metrics Dashboard
        </h1>
        
        <div className="flex items-center justify-center gap-8 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4 text-gray-400" />
            <span>4,344 enterprises</span>
          </div>
          <span>onboarded this month</span>
        </div>
      </div>

      <div className="mt-16">
        <div className="grid grid-cols-12 gap-8">
          {/* Revenue & Growth */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold mb-2">Revenue</h3>
              <div className="text-3xl font-semibold text-emerald-600">$749,201</div>
              <div className="h-32 bg-gradient-to-r from-emerald-500/10 to-emerald-500/20 rounded-lg mt-4"></div>
              <div className="flex items-center gap-2 mt-4 text-sm text-emerald-600">
                <TrendingUp className="w-4 h-4" />
                <span>+32% from last month</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                <Brain className="w-6 h-6 text-purple-600" />
                <div>
                  <h4 className="font-medium">AI Processing</h4>
                  <p className="text-sm text-gray-500">2.3M documents/month</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 p-4 bg-white rounded-lg shadow-sm">
                <FileText className="w-6 h-6 text-blue-600" />
                <div>
                  <h4 className="font-medium">Documents Created</h4>
                  <p className="text-sm text-gray-500">892k this month</p>
                </div>
              </div>
            </div>
          </div>

          {/* Product Metrics */}
          <div className="col-span-4 space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-2">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Processing Speed</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">98ms</span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[92%] h-full bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Accuracy Rate</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">99.2%</span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[99%] h-full bg-blue-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">API Uptime</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">99.99%</span>
                    <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="w-[99%] h-full bg-purple-500 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-4">Customer Success</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-32 h-2 bg-indigo-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Enterprise (45%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Mid-Market (35%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-emerald-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Startup (20%)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy & Operations */}
          <div className="col-span-4 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => handleCardClick('strengths')}
                className={`bg-blue-50 p-4 rounded-lg text-left transition-all cursor-pointer
                  ${selectedCard === 'strengths' ? 'ring-2 ring-offset-2 ring-blue-500' : 'hover:shadow-md'}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h4 className="text-blue-600 font-medium mb-2">Strengths</h4>
                <p className="text-sm text-gray-600">Advanced AI capabilities</p>
                {selectedCard === 'strengths' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-blue-500"
                  >
                    Click again to view details
                  </motion.p>
                )}
              </motion.button>

              <motion.button
                onClick={() => handleCardClick('weaknesses')}
                className={`bg-orange-50 p-4 rounded-lg text-left transition-all cursor-pointer
                  ${selectedCard === 'weaknesses' ? 'ring-2 ring-offset-2 ring-orange-500' : 'hover:shadow-md'}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h4 className="text-orange-600 font-medium mb-2">Weaknesses</h4>
                <p className="text-sm text-gray-600">Enterprise sales cycle</p>
                {selectedCard === 'weaknesses' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-orange-500"
                  >
                    Click again to view details
                  </motion.p>
                )}
              </motion.button>

              <motion.button
                onClick={() => handleCardClick('opportunities')}
                className={`bg-green-50 p-4 rounded-lg text-left transition-all cursor-pointer
                  ${selectedCard === 'opportunities' ? 'ring-2 ring-offset-2 ring-green-500' : 'hover:shadow-md'}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h4 className="text-green-600 font-medium mb-2">Opportunities</h4>
                <p className="text-sm text-gray-600">Market expansion</p>
                {selectedCard === 'opportunities' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-green-500"
                  >
                    Click again to view details
                  </motion.p>
                )}
              </motion.button>

              <motion.button
                onClick={() => handleCardClick('threats')}
                className={`bg-red-50 p-4 rounded-lg text-left transition-all cursor-pointer
                  ${selectedCard === 'threats' ? 'ring-2 ring-offset-2 ring-red-500' : 'hover:shadow-md'}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <h4 className="text-red-600 font-medium mb-2">Threats</h4>
                <p className="text-sm text-gray-600">Competitive landscape</p>
                {selectedCard === 'threats' && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 text-xs text-red-500"
                  >
                    Click again to view details
                  </motion.p>
                )}
              </motion.button>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="text-lg font-medium mb-2">Strategic Initiatives</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiatives.gpt4}
                    onChange={() => handleInitiativeChange('gpt4')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Launch GPT-4 integration</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiatives.api}
                    onChange={() => handleInitiativeChange('api')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Expand API capabilities</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiatives.dataCenter}
                    onChange={() => handleInitiativeChange('dataCenter')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">EU data center launch</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiatives.sso}
                    onChange={() => handleInitiativeChange('sso')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Enterprise SSO</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={initiatives.aiModels}
                    onChange={() => handleInitiativeChange('aiModels')}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-600">Custom AI models</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Growth Metrics</h3>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Customer LTV</span>
                  <span className="font-medium">$45,000</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">CAC</span>
                  <span className="font-medium">$5,200</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Payback Period</span>
                  <span className="font-medium">4.2 months</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}