import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  to: string;
  description?: string;
}

export default function MetricCard({ title, value, change, icon: Icon, to, description }: MetricCardProps) {
  const isPositive = change && change >= 0;

  return (
    <Link to={to}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      className="bg-card/80 backdrop-blur-xl p-6 rounded-xl shadow-sm border border-border/50 hover:shadow-md transition-shadow"
      >
        <div className="flex justify-between items-start">
          <div>
            <p className="text-sm text-gray-500">{title}</p>
            <h3 className="text-2xl font-semibold mt-1">{value}</h3>
          </div>
          <Icon className="w-6 h-6 text-emerald-600" />
        </div>
        
        {change !== undefined && (
          <div className="flex items-center mt-4">
            <span className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
              {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              {Math.abs(change)}%
            </span>
            <span className="text-gray-500 text-sm ml-2">vs last month</span>
          </div>
        )}
        
        {description && (
          <p className="text-sm text-gray-500 mt-2">{description}</p>
        )}
      </motion.div>
    </Link>
  );
}