import React from 'react';
import { CheckCircle2, Truck, Box, Package, AlertCircle, Clock, MapPin } from 'lucide-react';
import dayjs from 'dayjs';
import { cn } from '../utils';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const getEntryTimestamp = (entry = {}) => (
  entry.timestamp || entry.providerEventAt || entry.event_time || entry.createdAt || entry.updatedAt
);

const OrderTrackingTimeline = ({ history = [], currentStatus = '' }) => {
  const fallbackStatus = currentStatus || 'Update';

  if (!history || history.length === 0) {
    return (
      <div className="text-center py-8 border border-dashed rounded-lg">
        <p className="text-muted-foreground">No tracking history available yet.</p>
      </div>
    );
  }

  const sortedHistory = [...history].sort((a, b) => {
    const left = dayjs(getEntryTimestamp(a)).valueOf() || 0;
    const right = dayjs(getEntryTimestamp(b)).valueOf() || 0;
    return right - left;
  });

  const getStatusIcon = (status) => {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus.includes('delivered')) return <CheckCircle2 className="h-5 w-5" />;
    if (normalizedStatus.includes('shipped') || normalizedStatus.includes('transit')) return <Truck className="h-5 w-5" />;
    if (normalizedStatus.includes('out_for_delivery')) return <Truck className="h-5 w-5" />;
    if (normalizedStatus.includes('confirmed') || normalizedStatus.includes('paid')) return <Package className="h-5 w-5" />;
    if (normalizedStatus.includes('processing')) return <Box className="h-5 w-5" />;
    if (normalizedStatus.includes('cancel') || normalizedStatus.includes('fail') || normalizedStatus.includes('exception')) {
      return <AlertCircle className="h-5 w-5" />;
    }
    return <Clock className="h-5 w-5" />;
  };

  const getStatusColor = (status, isLatest) => {
    const normalizedStatus = String(status || '').toLowerCase();
    if (normalizedStatus.includes('delivered')) return isLatest ? 'text-green-600 bg-green-50 border-green-200' : 'text-green-500';
    if (normalizedStatus.includes('cancel') || normalizedStatus.includes('fail') || normalizedStatus.includes('exception')) {
      return isLatest ? 'text-red-600 bg-red-50 border-red-200' : 'text-red-500';
    }
    if (normalizedStatus.includes('shipped') || normalizedStatus.includes('transit') || normalizedStatus.includes('out_for_delivery')) {
      return isLatest ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-blue-500';
    }
    return isLatest ? 'text-primary bg-primary/10 border-primary/20' : 'text-muted-foreground';
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pb-4">
        <CardTitle className="text-lg font-heading font-medium flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          Tracking Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <div className="relative space-y-0">
          <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-border" />

          {sortedHistory.map((entry, index) => {
            const isLatest = index === 0;
            const status = entry.status || entry.rawStatus || fallbackStatus;
            const timestamp = getEntryTimestamp(entry);

            return (
              <div key={`${status}-${timestamp || index}`} className="relative pl-12 pb-8 last:pb-0">
                <div
                  className={cn(
                    'absolute left-0 top-0 z-10 flex h-10 w-10 items-center justify-center rounded-full border bg-background shadow-sm transition-all',
                    getStatusColor(status, isLatest),
                    isLatest ? 'scale-110 border-2' : 'border-muted'
                  )}
                >
                  {getStatusIcon(status)}
                </div>

                <div className={cn('flex flex-col gap-1 transition-opacity', !isLatest && 'opacity-80')}>
                  <div className="flex items-center justify-between gap-4">
                    <h4
                      className={cn(
                        'font-medium capitalize leading-none',
                        isLatest ? 'text-foreground text-base' : 'text-muted-foreground text-sm'
                      )}
                    >
                      {String(status).replace(/_/g, ' ')}
                    </h4>
                    {timestamp && (
                      <time className="text-xs text-muted-foreground whitespace-nowrap">
                        {dayjs(timestamp).format('MMM DD, h:mm A')}
                      </time>
                    )}
                  </div>

                  {(entry.description || entry.note || entry.location) && (
                    <div className="mt-1 flex flex-col gap-0.5">
                      {(entry.description || entry.note) && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {entry.description || entry.note}
                        </p>
                      )}
                      {entry.location && (
                        <p className="text-xs font-medium text-primary/80 flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> {entry.location}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrderTrackingTimeline;
