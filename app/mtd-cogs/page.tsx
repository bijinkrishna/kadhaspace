'use client';



import { useEffect, useState } from 'react';

import { 

  Calendar,

  DollarSign,

  TrendingUp,

  TrendingDown,

  Package,

  ShoppingCart,

  AlertCircle,

  RefreshCw,

  Percent

} from 'lucide-react';



interface MTDData {

  period_start: string;

  period_end: string;

  opening_stock_value: number;

  purchases_value: number;

  closing_stock_value: number;

  cogs: number;

  revenue: number;

  sales_count: number;

  gross_profit: number;

  profit_margin: number;

}



export default function MTDCogsPage() {

  const [data, setData] = useState<MTDData | null>(null);

  const [loading, setLoading] = useState(true);

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const [customRange, setCustomRange] = useState(false);

  const [startDate, setStartDate] = useState('');

  const [endDate, setEndDate] = useState('');



  useEffect(() => {

    fetchData();

  }, []);



  useEffect(() => {

    if (customRange && startDate && endDate) {

      fetchData();

    }

  }, [startDate, endDate]);



  const fetchData = async () => {

    setLoading(true);

    try {

      let url = '/api/mtd-cogs?t=' + Date.now();

      

      if (customRange && startDate && endDate) {

        url += `&start_date=${startDate}&end_date=${endDate}`;

      }

      

      const response = await fetch(url);

      const result = await response.json();

      setData(result);

      setLastUpdated(new Date());

    } catch (error) {

      console.error('Error fetching COGS:', error);

    } finally {

      setLoading(false);

    }

  };



  if (loading) {

    return (

      <div className="flex items-center justify-center min-h-screen">

        <div className="text-xl">Loading MTD analysis...</div>

      </div>

    );

  }



  if (!data) {

    return (

      <div className="flex items-center justify-center min-h-screen">

        <div className="text-xl text-red-600">Failed to load data</div>

      </div>

    );

  }



  return (

    <div className="min-h-screen bg-gray-50 p-6">

      <div className="max-w-7xl mx-auto">

        {/* Header with Date Range Selector */}

        <div className="bg-white rounded-lg shadow p-6 mb-6">

          <div className="flex justify-between items-start mb-4">

            <div>

              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">

                <Calendar className="w-8 h-8 text-blue-600" />

                COGS Analysis

              </h1>

              <p className="text-gray-600 mt-1">

                {data ? (

                  <>

                    {new Date(data.period_start).toLocaleDateString('en-IN', {

                      day: 'numeric',

                      month: 'long'

                    })} - {new Date(data.period_end).toLocaleDateString('en-IN', {

                      day: 'numeric',

                      month: 'long',

                      year: 'numeric'

                    })}

                  </>

                ) : 'Select date range'}

              </p>

              <p className="text-sm text-gray-500 mt-1">

                Last updated: {lastUpdated.toLocaleTimeString('en-IN')}

              </p>

            </div>

            <button

              onClick={fetchData}

              disabled={loading}

              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"

            >

              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />

              Refresh

            </button>

          </div>



          {/* Period Selector */}

          <div className="border-t pt-4">

            <div className="flex items-center gap-4 mb-4">

              <button

                onClick={() => {

                  setCustomRange(false);

                  setStartDate('');

                  setEndDate('');

                  fetchData();

                }}

                className={`px-4 py-2 rounded-lg font-medium ${

                  !customRange 

                    ? 'bg-blue-600 text-white' 

                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                }`}

              >

                Month-To-Date

              </button>

              <button

                onClick={() => setCustomRange(true)}

                className={`px-4 py-2 rounded-lg font-medium ${

                  customRange 

                    ? 'bg-blue-600 text-white' 

                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'

                }`}

              >

                Custom Range

              </button>

            </div>



            {customRange && (

              <div className="grid grid-cols-3 gap-4">

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    Start Date

                  </label>

                  <input

                    type="date"

                    value={startDate}

                    onChange={(e) => setStartDate(e.target.value)}

                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"

                  />

                </div>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-2">

                    End Date

                  </label>

                  <input

                    type="date"

                    value={endDate}

                    max={new Date().toISOString().split('T')[0]}

                    onChange={(e) => setEndDate(e.target.value)}

                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"

                  />

                </div>

                <div className="flex items-end">

                  <button

                    onClick={fetchData}

                    disabled={!startDate || !endDate || loading}

                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"

                  >

                    Generate Report

                  </button>

                </div>

              </div>

            )}

          </div>

        </div>



        {/* Stock Flow Diagram */}

        <div className="bg-white rounded-lg shadow p-8 mb-6">

          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">

            <Package className="w-6 h-6 text-orange-600" />

            Stock Flow & COGS Calculation

          </h2>

          

          <div className="grid grid-cols-5 gap-4 items-center">

            {/* Opening Stock */}

            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-center">

              <div className="text-sm text-blue-700 mb-1">Opening Stock</div>

              <div className="text-sm text-blue-600 mb-2">

                {new Date(data.period_start).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}

              </div>

              <div className="text-2xl font-bold text-blue-900">

                ₹{data.opening_stock_value.toLocaleString()}

              </div>

            </div>



            {/* Plus Icon */}

            <div className="text-center text-2xl text-gray-400 font-bold">+</div>



            {/* Purchases */}

            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-center">

              <div className="text-sm text-green-700 mb-1">Purchases</div>

              <div className="text-sm text-green-600 mb-2">MTD</div>

              <div className="text-2xl font-bold text-green-900">

                ₹{data.purchases_value.toLocaleString()}

              </div>

            </div>



            {/* Minus Icon */}

            <div className="text-center text-2xl text-gray-400 font-bold">−</div>



            {/* Closing Stock */}

            <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4 text-center">

              <div className="text-sm text-purple-700 mb-1">Closing Stock</div>

              <div className="text-sm text-purple-600 mb-2">Current</div>

              <div className="text-2xl font-bold text-purple-900">

                ₹{data.closing_stock_value.toLocaleString()}

              </div>

            </div>

          </div>



          {/* COGS Result */}

          <div className="mt-6 pt-6 border-t-2 border-gray-200">

            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-lg p-6 text-center">

              <div className="text-lg text-orange-700 mb-2">

                Cost of Goods Sold (COGS)

              </div>

              <div className="text-5xl font-bold text-orange-900">

                ₹{data.cogs.toLocaleString()}

              </div>

              <div className="text-sm text-orange-700 mt-2">

                Opening + Purchases - Closing

              </div>

            </div>

          </div>

        </div>



        {/* Revenue & Profit */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">

          {/* Revenue Card */}

          <div className="bg-white rounded-lg shadow p-6">

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-semibold flex items-center gap-2">

                <ShoppingCart className="w-6 h-6 text-green-600" />

                Revenue

              </h3>

            </div>

            <div className="text-4xl font-bold text-green-600 mb-2">

              ₹{data.revenue.toLocaleString()}

            </div>

            <div className="text-sm text-gray-600">

              {data.sales_count} sales transactions

            </div>

            <div className="text-sm text-gray-500 mt-2">

              Avg per sale: ₹{data.sales_count > 0 ? (data.revenue / data.sales_count).toFixed(0) : '0'}

            </div>

          </div>



          {/* COGS as % of Revenue Card - Key Metric */}

          <div className="bg-white rounded-lg shadow p-6 border-2 border-orange-200">

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-semibold flex items-center gap-2">

                <Percent className="w-6 h-6 text-orange-600" />

                COGS / Revenue

              </h3>

            </div>

            {(() => {

              const cogsPercentage = data.revenue > 0 ? (data.cogs / data.revenue) * 100 : 0;

              const getColorClass = (percentage: number) => {

                if (percentage <= 50) return 'text-green-600';

                if (percentage <= 65) return 'text-yellow-600';

                if (percentage <= 80) return 'text-orange-600';

                return 'text-red-600';

              };

              const getBgClass = (percentage: number) => {

                if (percentage <= 50) return 'bg-green-50 border-green-200';

                if (percentage <= 65) return 'bg-yellow-50 border-yellow-200';

                if (percentage <= 80) return 'bg-orange-50';

                return 'bg-red-50 border-red-200';

              };

              return (

                <div className={`${getBgClass(cogsPercentage)} rounded-lg p-3 border-2`}>

                  <div className={`text-4xl font-bold mb-2 ${getColorClass(cogsPercentage)}`}>

                    {cogsPercentage.toFixed(1)}%

                  </div>

                  <div className="text-sm text-gray-600">

                    COGS as % of Revenue

                  </div>

                  <div className="text-xs text-gray-500 mt-2">

                    {cogsPercentage <= 50 ? 'Excellent' :

                     cogsPercentage <= 65 ? 'Good' :

                     cogsPercentage <= 80 ? 'Fair' :

                     'Needs Attention'}

                  </div>

                </div>

              );

            })()}

          </div>



          {/* Profit Card */}

          <div className={`rounded-lg shadow p-6 ${

            data.gross_profit >= 0 ? 'bg-white' : 'bg-red-50'

          }`}>

            <div className="flex items-center justify-between mb-4">

              <h3 className="text-lg font-semibold flex items-center gap-2">

                {data.gross_profit >= 0 ? (

                  <TrendingUp className="w-6 h-6 text-blue-600" />

                ) : (

                  <TrendingDown className="w-6 h-6 text-red-600" />

                )}

                Gross Profit

              </h3>

            </div>

            <div className={`text-4xl font-bold mb-2 ${

              data.gross_profit >= 0 ? 'text-blue-600' : 'text-red-600'

            }`}>

              ₹{data.gross_profit.toLocaleString()}

            </div>

            <div className="text-sm text-gray-600">

              Revenue - COGS

            </div>

            <div className={`text-lg font-semibold mt-2 ${

              data.profit_margin >= 30 ? 'text-green-600' :

              data.profit_margin >= 15 ? 'text-yellow-600' :

              'text-red-600'

            }`}>

              {data.profit_margin.toFixed(1)}% margin

            </div>

          </div>

        </div>



        {/* Detailed Breakdown */}

        <div className="bg-white rounded-lg shadow p-6">

          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">

            <DollarSign className="w-6 h-6 text-green-600" />

            Detailed Breakdown

          </h2>

          <div className="space-y-3">

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded">

              <span className="text-gray-700">Opening Stock Value</span>

              <span className="font-semibold">₹{data.opening_stock_value.toLocaleString()}</span>

            </div>

            <div className="flex justify-between items-center p-3 bg-green-50 rounded">

              <span className="text-gray-700">+ Purchases (MTD)</span>

              <span className="font-semibold text-green-700">₹{data.purchases_value.toLocaleString()}</span>

            </div>

            <div className="flex justify-between items-center p-3 bg-purple-50 rounded">

              <span className="text-gray-700">- Closing Stock Value</span>

              <span className="font-semibold text-purple-700">₹{data.closing_stock_value.toLocaleString()}</span>

            </div>

            <div className="flex justify-between items-center p-4 bg-orange-50 rounded border-2 border-orange-200">

              <span className="text-lg font-semibold text-orange-900">= COGS</span>

              <span className="text-lg font-bold text-orange-900">₹{data.cogs.toLocaleString()}</span>

            </div>

            <div className="flex justify-between items-center p-4 bg-blue-50 rounded border-t-2 border-blue-200 mt-4">

              <span className="text-lg font-semibold text-blue-900">Revenue</span>

              <span className="text-lg font-bold text-blue-900">₹{data.revenue.toLocaleString()}</span>

            </div>

            <div className="flex justify-between items-center p-4 bg-orange-50 rounded border-2 border-orange-200">

              <span className="text-lg font-semibold text-orange-900">COGS as % of Revenue</span>

              <span className={`text-lg font-bold ${

                (() => {

                  const cogsPct = data.revenue > 0 ? (data.cogs / data.revenue) * 100 : 0;

                  if (cogsPct <= 50) return 'text-green-600';

                  if (cogsPct <= 65) return 'text-yellow-600';

                  if (cogsPct <= 80) return 'text-orange-600';

                  return 'text-red-600';

                })()

              }`}>

                {data.revenue > 0 ? ((data.cogs / data.revenue) * 100).toFixed(1) : '0.0'}%

              </span>

            </div>

            <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded border-2 border-blue-300">

              <span className="text-xl font-bold text-blue-900">Gross Profit</span>

              <span className={`text-xl font-bold ${

                data.gross_profit >= 0 ? 'text-green-700' : 'text-red-700'

              }`}>

                ₹{data.gross_profit.toLocaleString()} ({data.profit_margin.toFixed(1)}%)

              </span>

            </div>

          </div>

        </div>



        {/* Info Notice */}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">

          <div className="flex items-start gap-3">

            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />

            <div className="text-sm text-blue-800">

              <p className="font-semibold mb-1">About This Report:</p>

              <ul className="space-y-1 text-xs">

                <li>• Opening stock is calculated backward from current stock and MTD movements</li>

                <li>• For maximum accuracy, perform weekly stock adjustments</li>

                <li>• COGS reflects actual inventory consumption during the period</li>

                <li>• Margin is calculated as (Gross Profit / Revenue) × 100</li>

              </ul>

            </div>

          </div>

        </div>

      </div>

    </div>

  );

}

