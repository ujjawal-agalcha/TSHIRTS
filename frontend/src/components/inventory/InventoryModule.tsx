import React, { useState, useEffect } from 'react';
import { Package, Search, AlertTriangle, Plus, PlusCircle, MinusCircle, RefreshCw, Check } from 'lucide-react';
import { ApiService } from '../../services/api';
import { InventoryItem, Supplier } from '../../types';

export const InventoryModule: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterColor, setFilterColor] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // New item modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItem, setNewItem] = useState({
    sku: '',
    product_name: 'Oversized Streetwear Tee',
    color: 'Black',
    style: 'Oversized',
    size: 'L',
    stock_quantity: 30,
    reorder_level: 15,
    cost_price: 7.50,
    selling_price: 24.99,
  });

  useEffect(() => {
    loadInventory();
  }, [searchQuery, filterColor, filterStyle, filterLowStock]);

  const loadInventory = async () => {
    setIsLoading(true);
    try {
      const [inventoryData, suppliersData] = await Promise.all([
        ApiService.getInventory({
          q: searchQuery || undefined,
          color: filterColor || undefined,
          style: filterStyle || undefined,
          low_stock: filterLowStock || undefined,
        }),
        ApiService.getSuppliers()
      ]);
      setItems(inventoryData);
      setSuppliers(suppliersData);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdjustStock = async (itemId: number, delta: number) => {
    try {
      const updated = await ApiService.adjustStock(itemId, delta);
      setItems(prev => prev.map(item => item.id === itemId ? { ...item, stock_quantity: updated.stock_quantity } : item));
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await ApiService.createInventoryItem(newItem);
      setItems(prev => [created, ...prev]);
      setShowAddModal(false);
      setNewItem({
        sku: '',
        product_name: 'Oversized Streetwear Tee',
        color: 'Black',
        style: 'Oversized',
        size: 'L',
        stock_quantity: 30,
        reorder_level: 15,
        cost_price: 7.50,
        selling_price: 24.99,
      });
    } catch (err) {
      alert('Failed to create SKU. Please check if SKU already exists.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <span>Inventory Management</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {items.length} SKUs Active
            </span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Track blank garment stock levels, reorder alerts, SKUs, and purchase margins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center space-x-2 transition-all shadow-md shadow-blue-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Add Garment SKU</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-[#121927] border border-[#1e293d] rounded-xl p-3">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search by SKU, style, size..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
            />
          </div>

          <select
            value={filterColor}
            onChange={(e) => setFilterColor(e.target.value)}
            className="bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Colors</option>
            <option value="Black">Black</option>
            <option value="White">White</option>
          </select>

          <select
            value={filterStyle}
            onChange={(e) => setFilterStyle(e.target.value)}
            className="bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:border-blue-500 focus:outline-none"
          >
            <option value="">All Styles</option>
            <option value="Oversized">Oversized</option>
            <option value="Regular">Regular</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => setFilterLowStock(!filterLowStock)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all ${
            filterLowStock
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-[#0e1422] text-slate-400 border border-[#1e293d] hover:text-white'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Low Stock Only</span>
        </button>
      </div>

      {/* Inventory Table */}
      <div className="bg-[#121927] border border-[#1e293d] rounded-xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#1e293d] bg-[#0e1422] text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="p-3.5">SKU</th>
                <th className="p-3.5">Product & Style</th>
                <th className="p-3.5">Color</th>
                <th className="p-3.5">Size</th>
                <th className="p-3.5">In Stock</th>
                <th className="p-3.5">Threshold</th>
                <th className="p-3.5">Cost / Retail</th>
                <th className="p-3.5">Supplier</th>
                <th className="p-3.5 text-right">Quick Adjust</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293d] text-xs">
              {items.map((item) => {
                const isLow = item.stock_quantity <= item.reorder_level;
                return (
                  <tr key={item.id} className="hover:bg-[#162032] transition-colors">
                    <td className="p-3.5 font-mono font-bold text-white">
                      {item.sku}
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">
                      {item.product_name}
                      <span className="text-[10px] text-slate-400 block">{item.style}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="inline-flex items-center space-x-1.5 text-slate-300">
                        <span className={`w-2.5 h-2.5 rounded-full border border-slate-600 ${item.color === 'Black' ? 'bg-black' : 'bg-white'}`} />
                        <span>{item.color}</span>
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-200">
                      {item.size}
                    </td>
                    <td className="p-3.5">
                      <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded ${
                        isLow ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-emerald-400'
                      }`}>
                        {item.stock_quantity}
                      </span>
                    </td>
                    <td className="p-3.5 font-mono text-slate-400">
                      {item.reorder_level} units
                    </td>
                    <td className="p-3.5 font-mono text-slate-300">
                      ${item.cost_price.toFixed(2)} / <strong className="text-white">${item.selling_price.toFixed(2)}</strong>
                    </td>
                    <td className="p-3.5 text-slate-400">
                      {item.supplier_name || 'Apex Textiles'}
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="inline-flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, -1)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Decrease Stock (-1)"
                        >
                          <MinusCircle className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAdjustStock(item.id, 1)}
                          className="p-1 text-slate-400 hover:text-emerald-400 rounded hover:bg-slate-800 transition-colors"
                          title="Increase Stock (+1)"
                        >
                          <PlusCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add SKU Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121927] border border-[#1e293d] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293d]">
              <h3 className="text-base font-bold text-white">Add Garment Inventory SKU</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">SKU Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OS-BLK-M"
                  value={newItem.sku}
                  onChange={(e) => setNewItem({ ...newItem, sku: e.target.value.toUpperCase() })}
                  className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Color</label>
                  <select
                    value={newItem.color}
                    onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Black">Black</option>
                    <option value="White">White</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Style</label>
                  <select
                    value={newItem.style}
                    onChange={(e) => setNewItem({ ...newItem, style: e.target.value })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Oversized">Oversized</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-slate-400 block mb-1">Size</label>
                  <select
                    value={newItem.size}
                    onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="S">S</option>
                    <option value="M">M</option>
                    <option value="L">L</option>
                    <option value="XL">XL</option>
                    <option value="XXL">XXL</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={newItem.stock_quantity}
                    onChange={(e) => setNewItem({ ...newItem, stock_quantity: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">Reorder Level</label>
                  <input
                    type="number"
                    value={newItem.reorder_level}
                    onChange={(e) => setNewItem({ ...newItem, reorder_level: Number(e.target.value) })}
                    className="w-full bg-[#0e1422] border border-[#1e293d] rounded-lg px-3 py-2 text-white font-mono focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-[#1e293d]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-2 rounded-lg bg-[#0e1422] text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-md shadow-blue-600/30"
                >
                  Save SKU
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
