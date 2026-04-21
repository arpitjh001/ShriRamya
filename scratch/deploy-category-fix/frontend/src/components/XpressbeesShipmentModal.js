import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Truck, Package, Info, CheckCircle, AlertTriangle, ChevronRight, Search, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { toast } from 'sonner';
import adminOrderService from '../services/adminOrderService';

const XpressbeesShipmentModal = ({ order, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [checkingServiceability, setCheckingServiceability] = useState(false);
  const [couriers, setCouriers] = useState([]);
  const [serviceability, setServiceability] = useState(null);
  const [selectedCourier, setSelectedCourier] = useState(null);
  
  const [formData, setFormData] = useState({
    weight: 0.5,
    length: 10,
    width: 10,
    height: 10,
    pickup_location: 'Primary' // Default pickup location
  });

  const pincode = order.shippingAddress?.pincode;

  useEffect(() => {
    if (pincode) {
      handleCheckServiceability();
    }
  }, [pincode]);

  const handleCheckServiceability = async () => {
    if (!pincode) return;
    setCheckingServiceability(true);
    try {
      const res = await adminOrderService.checkXpressbeesServiceability({
        destination_pincode: pincode,
        order_type: order.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
        weight: formData.weight
      });
      
      if (res.data) {
        setServiceability(res.data);
        // If there are couriers, set the first one as default
        if (res.data.available_couriers?.length > 0) {
          setCouriers(res.data.available_couriers);
          setSelectedCourier(res.data.available_couriers[0].courier_id);
        }
      }
    } catch (err) {
      console.error('Serviceability check error:', err);
      toast.error('Failed to check serviceability');
    } finally {
      setCheckingServiceability(false);
    }
  };

  const handleCreateShipment = async () => {
    if (!selectedCourier) {
      toast.error('Please select a courier');
      return;
    }

    setLoading(true);
    try {
      const shipmentData = {
        provider: 'xpressbees',
        weight: formData.weight,
        length: formData.length,
        width: formData.width,
        height: formData.height,
        courier_id: selectedCourier,
        request_auto_pickup: true
      };

      const res = await adminOrderService.createShipment(order.orderId, shipmentData);
      
      if (res.data) {
        toast.success('Shipment created successfully via Xpressbees');
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      console.error('Create shipment error:', err);
      toast.error(err.message || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-royal-maroon/40 backdrop-blur-md px-4" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white border border-royal-maroon/10 rounded-2xl shadow-3xl max-w-lg w-full overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-royal-maroon/10 bg-royal-maroon/[0.02] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-royal-maroon/10 rounded-lg text-royal-maroon">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-bold text-charcoal">Ship via Xpressbees</h2>
              <p className="text-xs text-charcoal/50 mt-0.5">Fulfillment for Order #{order.orderId?.slice(-8)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-charcoal/40 hover:text-charcoal transition-colors p-2 hover:bg-royal-maroon/5 rounded-full">✕</button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
          {/* Destination Summary */}
          <div className="bg-background rounded-xl p-4 border border-royal-maroon/5 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-charcoal/40 mb-1">Destination</p>
              <p className="text-sm font-bold text-charcoal">{order.shippingAddress?.city}, {order.shippingAddress?.state} - {pincode}</p>
            </div>
            {checkingServiceability ? (
              <Loader2 className="w-5 h-5 text-royal-maroon animate-spin" />
            ) : serviceability?.serviceable ? (
              <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full text-[10px] font-bold">
                <CheckCircle className="w-3 h-3" /> Serviceable
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-full text-[10px] font-bold">
                <AlertTriangle className="w-3 h-3" /> Not Serviceable
              </div>
            )}
          </div>

          {/* Package Dimensions */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40">Package Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal/60">Actual Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.weight}
                  onChange={(e) => setFormData({ ...formData, weight: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 border border-royal-maroon/10 rounded-lg bg-background text-sm focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal/60">Pickup Location</label>
                <select className="w-full px-3 py-2 border border-royal-maroon/10 rounded-lg bg-background text-sm focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none">
                  <option>Primary Warehouse</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal/60">Length (cm)</label>
                <input
                  type="number"
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 border border-royal-maroon/10 rounded-lg bg-background text-xs focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal/60">Width (cm)</label>
                <input
                  type="number"
                  value={formData.width}
                  onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 border border-royal-maroon/10 rounded-lg bg-background text-xs focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal/60">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height}
                  onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) })}
                  className="w-full px-2 py-2 border border-royal-maroon/10 rounded-lg bg-background text-xs focus:ring-2 focus:ring-royal-maroon/20 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Courier Selection */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-widest text-charcoal/40 flex items-center justify-between">
              Available Couriers
              <button onClick={handleCheckServiceability} className="text-royal-maroon hover:underline flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer">
                <Search className="w-3 h-3" /> Refresh
              </button>
            </h3>
            
            <div className="space-y-2">
              {couriers.length > 0 ? (
                couriers.map((c) => (
                  <label
                    key={c.courier_id}
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedCourier === c.courier_id
                        ? 'border-royal-maroon bg-royal-maroon/[0.03]'
                        : 'border-royal-maroon/5 hover:border-royal-maroon/20'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="courier"
                        checked={selectedCourier === c.courier_id}
                        onChange={() => setSelectedCourier(c.courier_id)}
                        className="w-4 h-4 accent-royal-maroon"
                      />
                      <div>
                        <p className="text-sm font-bold text-charcoal">{c.courier_name}</p>
                        <p className="text-[11px] text-charcoal/50 capitalize">{c.service_type || 'Express'}</p>
                      </div>
                    </div>
                    {c.rate && (
                      <p className="text-sm font-bold text-royal-maroon">Rs.{c.rate}</p>
                    )}
                  </label>
                ))
              ) : (
                <div className="text-center py-8 border-2 border-dashed border-royal-maroon/10 rounded-xl">
                  {checkingServiceability ? (
                    <p className="text-sm text-charcoal/40">Checking available services...</p>
                  ) : (
                    <p className="text-sm text-charcoal/40">No couriers available for this route</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Warning/Notes */}
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-100 flex gap-3">
            <Info className="w-5 h-5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Creating a shipment will automatically notify Xpressbees and request a pickup {formData.pickup_location === 'Primary' ? 'at the primary warehouse' : ''}. Ensure the items are packed and ready.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-royal-maroon/10 bg-royal-maroon/[0.01] flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            className="flex-[2] bg-royal-maroon text-white hover:bg-royal-maroon/90 shadow-lg shadow-royal-maroon/20"
            disabled={loading || !selectedCourier || !serviceability?.serviceable}
            onClick={handleCreateShipment}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Confirm & Book Shipment
                <ChevronRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default XpressbeesShipmentModal;
