import os
import re
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.inventory import Inventory
from app.models.pattern import Pattern
from app.models.template import Template, PrintZone
from app.models.design_job import DesignJob
from app.services.analytics_service import AnalyticsService

class AIAssistantService:
    @staticmethod
    def process_query(message: str, db: Session) -> Dict[str, Any]:
        msg_lower = message.strip().lower()
        
        # 1. Check for external Gemini API Key if user provided it
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if gemini_api_key:
            try:
                # If available, we could call Gemini, but let's ensure local fallback is 100% reliable first
                pass
            except Exception:
                pass
        
        # --- Local Deterministic Engine ---
        
        # A. Inventory Specific Queries, e.g. "How many black oversized L T-shirts do I have?"
        if ("how many" in msg_lower or "stock" in msg_lower or "count" in msg_lower or "quantity" in msg_lower) and ("t-shirt" in msg_lower or "tee" in msg_lower or "black" in msg_lower or "white" in msg_lower or "oversized" in msg_lower or "regular" in msg_lower):
            color = "Black" if "black" in msg_lower else ("White" if "white" in msg_lower else None)
            style = "Oversized" if "oversized" in msg_lower else ("Regular" if "regular" in msg_lower else None)
            
            # extract size (S, M, L, XL, XXL)
            size = None
            for s in ["xxl", "xl", "xs", "m", "l", "s"]:
                pattern = rf"\b{s}\b"
                if re.search(pattern, msg_lower):
                    size = s.upper()
                    break
            
            q = db.query(Inventory).filter(Inventory.is_active == True)
            if color:
                q = q.filter(Inventory.color.ilike(color))
            if style:
                q = q.filter(Inventory.style.ilike(style))
            if size:
                q = q.filter(Inventory.size.ilike(size))
            
            items = q.all()
            if items:
                lines = []
                total = 0
                for item in items:
                    lines.append(f"- **{item.sku}** ({item.color} {item.style}, Size {item.size}): **{item.stock_quantity} in stock** (Reorder level: {item.reorder_level})")
                    total += item.stock_quantity
                
                reply = f"Here is the current inventory matching your inquiry:\n\n" + "\n".join(lines) + f"\n\n**Total Units:** {total}"
                return {
                    "reply": reply,
                    "suggested_actions": ["View Inventory", "Adjust Stock", "Create Design Job"]
                }
            else:
                return {
                    "reply": f"I couldn't find active inventory matching color: {color or 'Any'}, style: {style or 'Any'}, size: {size or 'Any'}.",
                    "suggested_actions": ["View Full Inventory", "Add New SKU"]
                }

        # B. Low Stock Check
        if "low stock" in msg_lower or "reorder" in msg_lower or "out of stock" in msg_lower:
            low_items = db.query(Inventory).filter(Inventory.stock_quantity <= Inventory.reorder_level, Inventory.is_active == True).all()
            if low_items:
                lines = [f"- **{i.sku}** ({i.color} {i.style} {i.size}): **{i.stock_quantity} remaining** (Threshold: {i.reorder_level})" for i in low_items]
                return {
                    "reply": f"⚠️ **Attention: {len(low_items)} items are at or below reorder level:**\n\n" + "\n".join(lines) + "\n\nConsider contacting your suppliers soon to replenish.",
                    "suggested_actions": ["View Suppliers", "Order Stock", "Export Inventory"]
                }
            else:
                return {
                    "reply": "✅ All inventory items are currently well stocked above their reorder thresholds!",
                    "suggested_actions": ["View Inventory", "View Analytics"]
                }

        # C. Pattern Queries, e.g. "Which patterns support front and back printing?"
        if "front and back" in msg_lower or "both side" in msg_lower or "dual" in msg_lower:
            patterns = db.query(Pattern).filter(Pattern.category == "Dual-Print").all()
            lines = [f"- **{p.name}** (`{p.pattern_id}`): {p.description}" for p in patterns]
            return {
                "reply": f"We have **{len(patterns)} patterns** supporting dual Front + Back printing:\n\n" + "\n".join(lines),
                "suggested_actions": ["Open Design Generator", "View Pattern Library"]
            }

        # D. Available patterns listing
        if "pattern" in msg_lower and ("list" in msg_lower or "show" in msg_lower or "available" in msg_lower or "what" in msg_lower):
            patterns = db.query(Pattern).order_by(Pattern.sort_order.asc()).all()
            lines = [f"- **{p.name}** ({p.category}) - Uploads: `{p.get_required_uploads()}`" for p in patterns]
            return {
                "reply": f"Here are the **{len(patterns)} registered print patterns** in the studio:\n\n" + "\n".join(lines),
                "suggested_actions": ["Filter by Dual-Print", "Filter by Front-Only", "Open Design Generator"]
            }

        # E. Print Zones Query, e.g. "Show me available print zones" or "template sizes"
        if "print zone" in msg_lower or "zone" in msg_lower or "coordinates" in msg_lower or "template size" in msg_lower:
            template = db.query(Template).first()
            zones = db.query(PrintZone).all()
            lines = [f"- **{z.name}** (`{z.zone_code}`, {z.side.upper()}): X={z.x:.0f}px, Y={z.y:.0f}px, {z.width:.0f}×{z.height:.0f}px (Fit: `{z.fit_mode}`)" for z in zones]
            return {
                "reply": f"### Master Canvas Dimensions\n**{template.canvas_width} × {template.canvas_height} pixels**\n\n### Calibrated Print Zones:\n" + "\n".join(lines) + "\n\n*All coordinates can be calibrated interactively in the **Template Editor**.*",
                "suggested_actions": ["Open Template Editor", "Calibrate Left Chest", "Calibrate Full Back"]
            }

        # F. Most used pattern or color query, e.g. "Which pattern is used most often?"
        if "most used" in msg_lower or "most popular" in msg_lower or "analytics" in msg_lower or "top pattern" in msg_lower:
            metrics = AnalyticsService.get_dashboard_metrics(db)
            return {
                "reply": f"📊 **Production Insights:**\n\n- **Most-Used Pattern:** {metrics['most_used_pattern']}\n- **Most-Used Color:** {metrics['most_used_color']}\n- **Most-Used Style:** {metrics['most_used_style']}\n- **Total Generated PSDs:** {metrics['total_psd_generated']}\n- **Total Studio Designs:** {metrics['total_designs']}",
                "suggested_actions": ["View Analytics Dashboard", "Generate New Design"]
            }

        # G. Production workflow query
        if "workflow" in msg_lower or "how to" in msg_lower or "steps" in msg_lower or "generate" in msg_lower:
            return {
                "reply": "### Standard Production Workflow:\n1. **Select Garment Color** (White or Black)\n2. **Select Fit/Style** (Regular or Oversized Streetwear)\n3. **Choose Print Pattern** (e.g. Small Front + Full Back)\n4. **Upload Artwork** (PNG with transparency or high-res JPG)\n5. **Inspect Live 2D Preview** (Toggle Front/Back, zoom, fine-tune position)\n6. **Click 'Generate Print-Ready PSD'** (Exports authentic layered 2700×2643 px PSD)",
                "suggested_actions": ["Start New Design", "Calibrate Templates"]
            }

        # General Fallback
        return {
            "reply": f"I'm your **T-Shirt Print Studio AI Assistant**. I can help you with:\n\n- 📦 **Inventory & Stock Counts** (e.g. *'How many black oversized L T-shirts do I have?'*)\n- ⚠️ **Low Stock Alerts** (e.g. *'Show low stock items'*)\n- 🎨 **Print Patterns** (e.g. *'Which patterns support front and back printing?'*)\n- 📐 **Template & Print Zones** (e.g. *'Show me available print zones'*)\n- 📈 **Studio Analytics** (e.g. *'Which pattern is used most often?'*)\n- 🖨️ **Production Workflow** guidance",
            "suggested_actions": [
                "How many black oversized L T-shirts do I have?",
                "Which patterns support front and back printing?",
                "Show low stock items",
                "Show me available print zones"
            ]
        }
