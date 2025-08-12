/*
  # POS Configuration for Automatic GL Posting

  1. New Tables
    - `pos_configuration` - Main POS settings per business unit
    - `menu_item_gl_mapping` - GL account mappings for menu items
    - `payment_method_gl_mapping` - GL account mappings for payment methods
    
  2. Schema Updates
    - Add GL account references to existing tables
    - Add configuration flags for automatic posting
    
  3. Security
    - Enable RLS on all new tables
    - Add policies for business unit access
*/

-- Create POS Configuration table
CREATE TABLE IF NOT EXISTS pos_configuration (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_unit_id uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- Automatic posting settings
  auto_post_to_gl boolean DEFAULT false,
  auto_create_ar_invoice boolean DEFAULT false,
  
  -- Default GL accounts
  sales_revenue_account_id uuid REFERENCES gl_accounts(id),
  sales_tax_account_id uuid REFERENCES gl_accounts(id),
  cash_account_id uuid REFERENCES gl_accounts(id),
  discount_account_id uuid REFERENCES gl_accounts(id),
  service_charge_account_id uuid REFERENCES gl_accounts(id),
  
  -- POS specific settings
  default_customer_bp_code text DEFAULT 'WALK-IN',
  require_customer_selection boolean DEFAULT false,
  enable_discounts boolean DEFAULT true,
  enable_service_charge boolean DEFAULT false,
  service_charge_rate decimal(5,4) DEFAULT 0.0000,
  
  -- Numbering series
  ar_invoice_series_id uuid REFERENCES numbering_series(id),
  journal_entry_series_id uuid REFERENCES numbering_series(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by_id uuid REFERENCES users(id),
  updated_by_id uuid REFERENCES users(id),
  
  UNIQUE(business_unit_id)
);

-- Create Menu Item GL Mapping table
CREATE TABLE IF NOT EXISTS menu_item_gl_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  
  -- Revenue account for this menu item
  sales_account_id uuid NOT NULL REFERENCES gl_accounts(id),
  
  -- Cost of goods sold account (optional, for items with recipes)
  cogs_account_id uuid REFERENCES gl_accounts(id),
  
  -- Inventory account (optional, for items that deplete inventory)
  inventory_account_id uuid REFERENCES gl_accounts(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(menu_item_id)
);

-- Create Payment Method GL Mapping table
CREATE TABLE IF NOT EXISTS payment_method_gl_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_method_id uuid NOT NULL REFERENCES payment_methods(id) ON DELETE CASCADE,
  business_unit_id uuid NOT NULL REFERENCES business_units(id) ON DELETE CASCADE,
  
  -- GL account for this payment method (cash, bank, etc.)
  gl_account_id uuid NOT NULL REFERENCES gl_accounts(id),
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(payment_method_id, business_unit_id)
);

-- Add GL account reference to discounts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'discounts' AND column_name = 'gl_account_id'
  ) THEN
    ALTER TABLE discounts ADD COLUMN gl_account_id uuid REFERENCES gl_accounts(id);
  END IF;
END $$;

-- Add POS configuration reference to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'pos_config_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN pos_config_id uuid REFERENCES pos_configuration(id);
  END IF;
END $$;

-- Add journal entry reference to orders table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'journal_entry_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN journal_entry_id uuid REFERENCES journal_entries(id);
  END IF;
END $$;

-- Enable RLS
ALTER TABLE pos_configuration ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_gl_mapping ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_method_gl_mapping ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can access POS config for their business units"
  ON pos_configuration
  FOR ALL
  TO authenticated
  USING (
    business_unit_id IN (
      SELECT business_unit_id 
      FROM user_business_units 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can access menu item GL mappings for their business units"
  ON menu_item_gl_mapping
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM menu_items mi 
      WHERE mi.id = menu_item_id 
      AND mi.business_unit_id IN (
        SELECT business_unit_id 
        FROM user_business_units 
        WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can access payment method GL mappings for their business units"
  ON payment_method_gl_mapping
  FOR ALL
  TO authenticated
  USING (
    business_unit_id IN (
      SELECT business_unit_id 
      FROM user_business_units 
      WHERE user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_pos_configuration_business_unit ON pos_configuration(business_unit_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_gl_mapping_menu_item ON menu_item_gl_mapping(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_gl_mapping_payment_method ON payment_method_gl_mapping(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_method_gl_mapping_business_unit ON payment_method_gl_mapping(business_unit_id);