import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  useTheme
} from '@mui/material';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { useWallet } from '@aptos-labs/wallet-adapter-react';
import { Provider, Network } from 'aptos';

interface MarketMetrics {
  totalVolume: number;
  totalListings: number;
  totalSales: number;
  averagePrice: number;
  uniqueSellers: number;
  uniqueBuyers: number;
}

interface DailyMetric {
  timestamp: number;
  volume: number;
  transactions: number;
}

type MoveResponseData = {
  timestamp: string;
  volume: string;
  transactions: string;
}

const AnalyticsDashboard: React.FC = () => {
  const theme = useTheme();
  const { account } = useWallet();
  const [metrics, setMetrics] = useState<MarketMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<DailyMetric[]>([]);
  const [loading, setLoading] = useState(true);

  const provider = new Provider(Network.DEVNET);
  const MODULE_ADDRESS = "0xa256fddba13780914e70b6f74cf24af7548e796ad8dcbf331c85c93327f99ec4";

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!account) return;

      try {
        setLoading(true);

        // Fetch market metrics
        const marketMetricsResponse = await provider.view({
          function: `${MODULE_ADDRESS}::MarketPlaceAnalytics::get_market_metrics`,
          type_arguments: [],
          arguments: [MODULE_ADDRESS]
        });

        const [
          totalVolume,
          totalListings,
          totalSales,
          averagePrice,
          uniqueSellers,
          uniqueBuyers
        ] = marketMetricsResponse;

        setMetrics({
          totalVolume: Number(totalVolume),
          totalListings: Number(totalListings),
          totalSales: Number(totalSales),
          averagePrice: Number(averagePrice),
          uniqueSellers: Number(uniqueSellers),
          uniqueBuyers: Number(uniqueBuyers)
        });

        // Fetch time series data (last 30 days)
        const timeSeriesResponse = await provider.view({
          function: `${MODULE_ADDRESS}::MarketPlaceAnalytics::get_time_series_data`,
          type_arguments: [],
          arguments: [MODULE_ADDRESS, '30']
        });

        const parsedData = Array.isArray(timeSeriesResponse) && timeSeriesResponse[0] ? 
        (timeSeriesResponse[0] as MoveResponseData[]).map(day => ({
          timestamp: Number(day.timestamp),
          volume: Number(day.volume),
          transactions: Number(day.transactions)
        })) : [];

      setTimeSeriesData(parsedData);

      } catch (error) {
        console.error('Error fetching analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [account, provider]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const MetricCard: React.FC<{ title: string; value: string | number }> = ({ title, value }) => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography color="textSecondary" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h5" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Total Volume" 
            value={`${metrics?.totalVolume.toLocaleString()} APT`} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Total Sales" 
            value={metrics?.totalSales.toLocaleString() || '0'} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Average Price" 
            value={`${metrics?.averagePrice.toLocaleString()} APT`} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Total Listings" 
            value={metrics?.totalListings.toLocaleString() || '0'} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Unique Sellers" 
            value={metrics?.uniqueSellers.toLocaleString() || '0'} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard 
            title="Unique Buyers" 
            value={metrics?.uniqueBuyers.toLocaleString() || '0'} 
          />
        </Grid>

        {/* Volume Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Trading Volume
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeSeriesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp * 86400000).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp * 86400000).toLocaleDateString()}
                      formatter={(value: number) => [`${value} APT`, 'Volume']}
                    />
                    <Line
                      type="monotone"
                      dataKey="volume"
                      stroke={theme.palette.primary.main}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Transactions Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Daily Transactions
              </Typography>
              <Box sx={{ height: 400 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={timeSeriesData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp"
                      tickFormatter={(timestamp) => new Date(timestamp * 86400000).toLocaleDateString()}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(timestamp) => new Date(timestamp * 86400000).toLocaleDateString()}
                      formatter={(value: number) => [`${value}`, 'Transactions']}
                    />
                    <Line
                      type="monotone"
                      dataKey="transactions"
                      stroke={theme.palette.secondary.main}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnalyticsDashboard;
