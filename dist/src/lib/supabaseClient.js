"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = exports.createSupabaseClient = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const createSupabaseClient = () => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error("Missing Supabase environment variables");
    }
    return (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey);
};
exports.createSupabaseClient = createSupabaseClient;
exports.supabase = (0, exports.createSupabaseClient)();
