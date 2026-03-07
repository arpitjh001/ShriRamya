import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tag, Edit, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';

// Demo coupons data (since API requires auth)
const demoCoupons = [
  { id: 1, code: 'WELCOME20', type: 'percentage', value: 20, min_cart_value: 500, used_count: 45, usage_limit: 100, status: 'active' },
  { id: 2, code: 'FLAT500', type: 'flat', value: 500, min_cart_value: 2000, used_count: 12, usage_limit: 50, status: 'active' },
  { id: 3, code: 'FREESHIP', type: 'free_shipping', value: 0, min_cart_value: 999, used_count: 89, usage_limit: null, status: 'active' },
  { id: 4, code: 'BOGO2024', type: 'buy_x_get_y', value: 0, buy_x_qty: 2, get_y_qty: 1, min_cart_value: 0, used_count: 23, usage_limit: 30, status: 'active' },
  { id: 5, code: 'EXPIRED10', type: 'percentage', value: 10, min_cart_value: 0, used_count: 100, usage_limit: 100, status: 'expired' },
];

const AdminCouponsPage = () => {
  const handleDelete = (id) => {
    if (!window.confirm('Delete this coupon?')) return;
    toast.success('Coupon deleted (demo)');
  };

  const handleCreate = () => {
    toast.info('Create coupon feature coming soon!');
  };

  const getTypeBadge = (type, value) => {
    const badges = {
      percentage: `${value}%`,
      flat: `₹${value}`,
      free_shipping: 'Free Ship',
      buy_x_get_y: 'BOGO'
    };
    return badges[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Tag className="w-5 h-5" />
                Coupons
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">Manage discount codes and promotional offers</p>
            </div>
            <Button onClick={handleCreate} className="gap-2">
              <Plus className="w-4 h-4" />
              Create Coupon
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Min Cart</TableHead>
                  <TableHead>Usage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoCoupons.map((coupon) => (
                  <TableRow key={coupon.id}>
                    <TableCell className="font-mono font-bold text-primary">{coupon.code}</TableCell>
                    <TableCell className="capitalize">{coupon.type?.replace('_', ' ')}</TableCell>
                    <TableCell>
                      <Badge variant="default">{getTypeBadge(coupon.type, coupon.value)}</Badge>
                    </TableCell>
                    <TableCell>{coupon.min_cart_value ? `₹${coupon.min_cart_value}` : '₹0'}</TableCell>
                    <TableCell>
                      {coupon.used_count} / {coupon.usage_limit || '∞'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={coupon.status === 'active' ? 'default' : 'secondary'}>
                        {coupon.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => toast.info('Edit coming soon')}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(coupon.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Note:</strong> This is a demo view. Connect to the backend API to manage real coupons.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminCouponsPage;
