# Research: Shopify Storefront MCP — Ứng dụng cho SmartRec

**Date:** 2026-03-05 | **Sources:** 4

## Executive Summary

Shopify Storefront MCP (Model Context Protocol) là framework chuẩn hóa để AI agents truy cập real-time commerce data (catalog, cart, policies). Mọi Shopify store đã có MCP endpoint mặc định (`/api/mcp`) từ Summer 2025. Đây KHÔNG phải thứ SmartRec cần dùng trực tiếp — nhưng có thể tận dụng cho v2 AI-powered features.

## Storefront MCP là gì?

- Client-server protocol cho AI agents truy cập Shopify store data
- **Storefront MCP Server**: catalog search, cart ops, store policies
- **Customer Accounts MCP Server**: order tracking, returns
- **Checkout MCP Server**: full purchase flow
- Tự động expose trên mọi store — merchant không cần setup

### MCP Tools available:
- Natural-language product search + recommendations
- Cart create/modify/checkout
- Store policy answers, shipping, returns
- Order status tracking

## Ứng dụng cho SmartRec

### Không phù hợp (hiện tại)
SmartRec là **storefront script** chạy trên browser, không phải AI agent. MCP được thiết kế cho AI chatbots/agents giao tiếp bằng natural language, không phải cho rule-based intent engine.

### Có thể ứng dụng (v2)

| Feature | Cách dùng MCP | Effort |
|---------|--------------|--------|
| **AI Shopping Assistant** | Build chatbot dùng Storefront MCP để tìm products bằng natural language — thay vì rule-based alternatives | Cao |
| **Smarter UC-01** | Dùng MCP product search thay GraphQL query — natural language: "products similar to X but cheaper" | Trung bình |
| **UC-05 Returning Customer** | Dùng Customer Accounts MCP để lấy order history, recommend new arrivals | Trung bình |
| **MCP UI Components** | Dùng MCP UI extension để render interactive product cards trong chat | Trung bình |

### Universal Commerce Protocol (UCP) — March 2026
- Shopify + Google co-developed open standard
- AI agents có thể browse và mua hàng trực tiếp qua Google Search / Gemini
- SmartRec có thể evolve thành MCP-compatible recommendation provider

## Kết luận

**Cho MVP hiện tại:** Không cần MCP. Rule-based + Shopify Admin API đủ tốt.

**Cho v2:** MCP mở ra khả năng:
1. Chuyển từ rule-based sang AI-powered product discovery
2. Build shopping assistant chat widget dùng Storefront MCP
3. Tương thích với ecosystem AI rộng hơn (Claude, ChatGPT, Gemini)

**Recommended next step:** Nếu muốn thêm AI ngay, dùng `productRecommendations` GraphQL query (Shopify built-in ML) trước — đơn giản hơn MCP rất nhiều, hiệu quả tương đương cho use case hiện tại.

## Sources
- [Shopify Storefront MCP Docs](https://shopify.dev/docs/apps/build/storefront-mcp)
- [Shopify MCP Server Guide: Agentic Commerce 2026](https://wearepresta.com/shopify-mcp-server-the-standardized-interface-for-agentic-commerce-2026/)
- [Shopify AI Commerce at Scale](https://www.shopify.com/news/ai-commerce-at-scale)
- [Shopify MCP for Merchants 2026](https://ecommercefastlane.com/shopify-mcp-model-context-protocol/)
