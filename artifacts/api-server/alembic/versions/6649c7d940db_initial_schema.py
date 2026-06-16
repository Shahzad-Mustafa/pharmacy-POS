"""initial schema

Revision ID: 6649c7d940db
Revises:
Create Date: 2026-06-16 13:32:56.602889

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = '6649c7d940db'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Independent tables first
    op.create_table('medicines',
    sa.Column('name', sa.String(length=300), nullable=False),
    sa.Column('generic_name', sa.String(length=300), nullable=True),
    sa.Column('brand', sa.String(length=200), nullable=True),
    sa.Column('composition', sa.Text(), nullable=True),
    sa.Column('category', sa.String(length=100), nullable=True),
    sa.Column('atc_code', sa.String(length=20), nullable=True),
    sa.Column('ndc_code', sa.String(length=50), nullable=True),
    sa.Column('drap_registration_no', sa.String(length=100), nullable=True),
    sa.Column('rxcui', sa.String(length=50), nullable=True),
    sa.Column('barcode', sa.String(length=100), nullable=True),
    sa.Column('gtin', sa.String(length=50), nullable=True),
    sa.Column('unit', sa.String(length=50), nullable=True),
    sa.Column('form', sa.String(length=100), nullable=True),
    sa.Column('strength', sa.String(length=100), nullable=True),
    sa.Column('pack_size', sa.Integer(), nullable=True),
    sa.Column('manufacturer', sa.String(length=200), nullable=True),
    sa.Column('requires_prescription', sa.Boolean(), nullable=False),
    sa.Column('controlled_substance_schedule', sa.String(length=20), nullable=True),
    sa.Column('is_essential_medicine', sa.Boolean(), nullable=False),
    sa.Column('min_stock_level', sa.Integer(), nullable=False),
    sa.Column('reorder_point', sa.Integer(), nullable=False),
    sa.Column('mrp', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('storage_conditions', sa.Text(), nullable=True),
    sa.Column('contraindications', sa.JSON(), nullable=True),
    sa.Column('side_effects', sa.JSON(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('enrichment_data', sa.JSON(), nullable=True),
    sa.Column('last_enriched_at', sa.String(length=50), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('drap_registration_no')
    )
    op.create_index(op.f('ix_medicines_barcode'), 'medicines', ['barcode'], unique=True)
    op.create_index(op.f('ix_medicines_category'), 'medicines', ['category'], unique=False)
    op.create_index(op.f('ix_medicines_generic_name'), 'medicines', ['generic_name'], unique=False)
    op.create_index(op.f('ix_medicines_name'), 'medicines', ['name'], unique=False)

    op.create_table('insurance_providers',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('adapter', sa.String(length=50), nullable=False),
    sa.Column('claim_api_endpoint', sa.String(length=500), nullable=True),
    sa.Column('api_credentials', sa.JSON(), nullable=True),
    sa.Column('coverage_rules', sa.JSON(), nullable=True),
    sa.Column('is_cashless', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('contact', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('notification_templates',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('type', sa.String(length=100), nullable=False),
    sa.Column('channel', sa.String(length=50), nullable=False),
    sa.Column('template_id', sa.String(length=200), nullable=True),
    sa.Column('body', sa.Text(), nullable=False),
    sa.Column('language', sa.String(length=20), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('suppliers',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('contact_person', sa.String(length=200), nullable=True),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('license_number', sa.String(length=100), nullable=True),
    sa.Column('ntn', sa.String(length=50), nullable=True),
    sa.Column('credit_days', sa.Integer(), nullable=False),
    sa.Column('payment_terms', sa.String(length=100), nullable=True),
    sa.Column('bank_details', sa.JSON(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_suppliers_name'), 'suppliers', ['name'], unique=False)

    op.create_table('system_settings',
    sa.Column('key', sa.String(length=100), nullable=False),
    sa.Column('value', sa.JSON(), nullable=True),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('key')
    )

    # users without branch_id FK (circular: users→branches→users)
    op.create_table('users',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('email', sa.String(length=255), nullable=False),
    sa.Column('hashed_password', sa.String(length=255), nullable=False),
    sa.Column('role', sa.String(length=50), nullable=False),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('force_password_change', sa.Boolean(), nullable=False),
    sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
    sa.Column('permissions', sa.JSON(), nullable=True),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # branches with manager_id FK to users
    op.create_table('branches',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('code', sa.String(length=20), nullable=False),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('license_number', sa.String(length=100), nullable=True),
    sa.Column('manager_id', sa.UUID(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('settings', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['manager_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('code')
    )

    # Now add branch_id FK to users
    op.create_foreign_key('fk_users_branch_id', 'users', 'branches', ['branch_id'], ['id'])

    op.create_table('audit_logs',
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('action', sa.String(length=100), nullable=False),
    sa.Column('entity_type', sa.String(length=100), nullable=False),
    sa.Column('entity_id', sa.String(length=255), nullable=True),
    sa.Column('before_data', sa.JSON(), nullable=True),
    sa.Column('after_data', sa.JSON(), nullable=True),
    sa.Column('ip_address', sa.String(length=45), nullable=True),
    sa.Column('user_agent', sa.Text(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('medicine_price_history',
    sa.Column('medicine_id', sa.UUID(), nullable=False),
    sa.Column('old_mrp', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('new_mrp', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('effective_date', sa.String(length=20), nullable=True),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('changed_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['changed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('notification_preferences',
    sa.Column('user_id', sa.UUID(), nullable=False),
    sa.Column('preferences', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('user_id')
    )

    op.create_table('notifications',
    sa.Column('user_id', sa.UUID(), nullable=True),
    sa.Column('type', sa.String(length=100), nullable=False),
    sa.Column('channel', sa.String(length=50), nullable=False),
    sa.Column('title', sa.String(length=300), nullable=False),
    sa.Column('message', sa.Text(), nullable=False),
    sa.Column('data', sa.JSON(), nullable=True),
    sa.Column('is_read', sa.Boolean(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('patients',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('dob', sa.Date(), nullable=True),
    sa.Column('gender', sa.String(length=20), nullable=True),
    sa.Column('phone', sa.String(length=50), nullable=True),
    sa.Column('email', sa.String(length=255), nullable=True),
    sa.Column('address', sa.Text(), nullable=True),
    sa.Column('cnic', sa.String(length=20), nullable=True),
    sa.Column('mrn', sa.String(length=100), nullable=True),
    sa.Column('ward', sa.String(length=100), nullable=True),
    sa.Column('blood_group', sa.String(length=10), nullable=True),
    sa.Column('allergies', sa.JSON(), nullable=True),
    sa.Column('chronic_conditions', sa.JSON(), nullable=True),
    sa.Column('chronic_medications', sa.JSON(), nullable=True),
    sa.Column('emergency_contact', sa.JSON(), nullable=True),
    sa.Column('customer_type', sa.String(length=20), nullable=False),
    sa.Column('insurance_provider_id', sa.UUID(), nullable=True),
    sa.Column('insurance_member_id', sa.String(length=100), nullable=True),
    sa.Column('loyalty_points', sa.Integer(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['insurance_provider_id'], ['insurance_providers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('mrn')
    )
    op.create_index(op.f('ix_patients_cnic'), 'patients', ['cnic'], unique=True)
    op.create_index(op.f('ix_patients_name'), 'patients', ['name'], unique=False)
    op.create_index(op.f('ix_patients_phone'), 'patients', ['phone'], unique=False)

    op.create_table('printer_configs',
    sa.Column('name', sa.String(length=200), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('type', sa.String(length=50), nullable=False),
    sa.Column('ip', sa.String(length=100), nullable=True),
    sa.Column('port', sa.Integer(), nullable=True),
    sa.Column('usb_vendor_id', sa.String(length=50), nullable=True),
    sa.Column('usb_product_id', sa.String(length=50), nullable=True),
    sa.Column('serial_port', sa.String(length=100), nullable=True),
    sa.Column('baud_rate', sa.Integer(), nullable=True),
    sa.Column('paper_width', sa.Integer(), nullable=False),
    sa.Column('is_default', sa.Boolean(), nullable=False),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('purchase_orders',
    sa.Column('po_number', sa.String(length=100), nullable=False),
    sa.Column('supplier_id', sa.UUID(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('order_date', sa.Date(), nullable=True),
    sa.Column('expected_date', sa.Date(), nullable=True),
    sa.Column('discount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('tax', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('sent_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('po_number')
    )

    op.create_table('stock_counts',
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('count_date', sa.Date(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('confirmed_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['confirmed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('stock_transfers',
    sa.Column('from_branch_id', sa.UUID(), nullable=False),
    sa.Column('to_branch_id', sa.UUID(), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('transfer_date', sa.Date(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['from_branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['to_branch_id'], ['branches.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('supplier_payments',
    sa.Column('supplier_id', sa.UUID(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('payment_date', sa.Date(), nullable=True),
    sa.Column('method', sa.String(length=50), nullable=False),
    sa.Column('reference', sa.String(length=100), nullable=True),
    sa.Column('grn_ids', sa.JSON(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('supplier_returns',
    sa.Column('return_number', sa.String(length=100), nullable=False),
    sa.Column('supplier_id', sa.UUID(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('return_date', sa.Date(), nullable=True),
    sa.Column('credit_note_expected', sa.Boolean(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('return_number')
    )

    op.create_table('grns',
    sa.Column('grn_number', sa.String(length=100), nullable=False),
    sa.Column('po_id', sa.UUID(), nullable=True),
    sa.Column('supplier_id', sa.UUID(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('received_date', sa.Date(), nullable=True),
    sa.Column('supplier_invoice_number', sa.String(length=100), nullable=True),
    sa.Column('received_by_id', sa.UUID(), nullable=True),
    sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['po_id'], ['purchase_orders.id'], ),
    sa.ForeignKeyConstraint(['received_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('grn_number')
    )

    op.create_table('notification_logs',
    sa.Column('notification_id', sa.UUID(), nullable=True),
    sa.Column('recipient_type', sa.String(length=50), nullable=False),
    sa.Column('recipient_id', sa.String(length=255), nullable=True),
    sa.Column('channel', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('error_message', sa.Text(), nullable=True),
    sa.Column('sent_at', sa.String(length=50), nullable=True),
    sa.Column('payload', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['notification_id'], ['notifications.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('po_items',
    sa.Column('po_id', sa.UUID(), nullable=False),
    sa.Column('medicine_id', sa.UUID(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('quantity_received', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['po_id'], ['purchase_orders.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('prescriptions',
    sa.Column('patient_id', sa.UUID(), nullable=True),
    sa.Column('doctor_id', sa.UUID(), nullable=True),
    sa.Column('prescriber_name', sa.String(length=200), nullable=True),
    sa.Column('prescriber_license', sa.String(length=100), nullable=True),
    sa.Column('prescription_date', sa.Date(), nullable=True),
    sa.Column('prescription_number', sa.String(length=100), nullable=True),
    sa.Column('hospital_ward', sa.String(length=100), nullable=True),
    sa.Column('source', sa.String(length=50), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('allergy_warnings', sa.JSON(), nullable=True),
    sa.Column('verified_by_id', sa.UUID(), nullable=True),
    sa.Column('verified_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('dispensed_by_id', sa.UUID(), nullable=True),
    sa.Column('dispensed_at', sa.DateTime(timezone=True), nullable=True),
    sa.Column('refills_allowed', sa.Integer(), nullable=False),
    sa.Column('refills_used', sa.Integer(), nullable=False),
    sa.Column('image_url', sa.String(length=500), nullable=True),
    sa.Column('ocr_confidence', sa.Numeric(precision=5, scale=4), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['dispensed_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['doctor_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['verified_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('prescription_number')
    )

    # sales without insurance_claim_id FK (circular: sales→insurance_claims→sales)
    op.create_table('sales',
    sa.Column('invoice_number', sa.String(length=100), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('patient_id', sa.UUID(), nullable=True),
    sa.Column('prescription_id', sa.UUID(), nullable=True),
    sa.Column('cashier_id', sa.UUID(), nullable=True),
    sa.Column('sale_type', sa.String(length=20), nullable=False),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('ward', sa.String(length=100), nullable=True),
    sa.Column('encounter_id', sa.String(length=100), nullable=True),
    sa.Column('subtotal', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('discount_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('discount_pct', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('tax_rate', sa.Numeric(precision=5, scale=4), nullable=False),
    sa.Column('tax_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('payment_method', sa.String(length=50), nullable=False),
    sa.Column('amount_tendered', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('change_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('insurance_claim_id', sa.UUID(), nullable=True),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('is_refund', sa.Boolean(), nullable=False),
    sa.Column('refund_of_id', sa.UUID(), nullable=True),
    sa.Column('warnings', sa.JSON(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['cashier_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ),
    sa.ForeignKeyConstraint(['refund_of_id'], ['sales.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_sales_invoice_number'), 'sales', ['invoice_number'], unique=True)

    op.create_table('insurance_claims',
    sa.Column('sale_id', sa.UUID(), nullable=True),
    sa.Column('patient_id', sa.UUID(), nullable=True),
    sa.Column('provider_id', sa.UUID(), nullable=False),
    sa.Column('prescription_id', sa.UUID(), nullable=True),
    sa.Column('status', sa.String(length=50), nullable=False),
    sa.Column('claim_amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('patient_copay', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('approved_amount', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('items', sa.JSON(), nullable=True),
    sa.Column('diagnosis_codes', sa.JSON(), nullable=True),
    sa.Column('documents', sa.JSON(), nullable=True),
    sa.Column('submission_notes', sa.Text(), nullable=True),
    sa.Column('submitted_at', sa.String(length=50), nullable=True),
    sa.Column('adjudicated_at', sa.String(length=50), nullable=True),
    sa.Column('branch_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ),
    sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ),
    sa.ForeignKeyConstraint(['provider_id'], ['insurance_providers.id'], ),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    # Now add insurance_claim_id FK to sales
    op.create_foreign_key('fk_sales_insurance_claim_id', 'sales', 'insurance_claims', ['insurance_claim_id'], ['id'])

    op.create_table('medicine_batches',
    sa.Column('medicine_id', sa.UUID(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('batch_number', sa.String(length=100), nullable=False),
    sa.Column('serial_number', sa.String(length=100), nullable=True),
    sa.Column('expiry_date', sa.Date(), nullable=True),
    sa.Column('manufacturing_date', sa.Date(), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('purchase_price', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('selling_price', sa.Numeric(precision=12, scale=2), nullable=True),
    sa.Column('supplier_id', sa.UUID(), nullable=True),
    sa.Column('grn_id', sa.UUID(), nullable=True),
    sa.Column('is_active', sa.Boolean(), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['grn_id'], ['grns.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['supplier_id'], ['suppliers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('prescription_items',
    sa.Column('prescription_id', sa.UUID(), nullable=False),
    sa.Column('medicine_id', sa.UUID(), nullable=True),
    sa.Column('drug_text', sa.String(length=300), nullable=True),
    sa.Column('dosage', sa.String(length=100), nullable=True),
    sa.Column('frequency', sa.String(length=100), nullable=True),
    sa.Column('duration', sa.String(length=100), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=True),
    sa.Column('instructions', sa.Text(), nullable=True),
    sa.Column('match_confidence', sa.Numeric(precision=5, scale=4), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['prescription_id'], ['prescriptions.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('grn_items',
    sa.Column('grn_id', sa.UUID(), nullable=False),
    sa.Column('medicine_id', sa.UUID(), nullable=False),
    sa.Column('batch_number', sa.String(length=100), nullable=False),
    sa.Column('expiry_date', sa.Date(), nullable=True),
    sa.Column('manufacturing_date', sa.Date(), nullable=True),
    sa.Column('quantity_ordered', sa.Integer(), nullable=False),
    sa.Column('quantity_received', sa.Integer(), nullable=False),
    sa.Column('free_qty', sa.Integer(), nullable=False),
    sa.Column('purchase_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('selling_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('batch_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['grn_id'], ['grns.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('sale_items',
    sa.Column('sale_id', sa.UUID(), nullable=False),
    sa.Column('medicine_id', sa.UUID(), nullable=False),
    sa.Column('batch_id', sa.UUID(), nullable=True),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('unit_price', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('discount_pct', sa.Numeric(precision=5, scale=2), nullable=False),
    sa.Column('discount_flat', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('line_total', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['medicine_id'], ['medicines.id'], ),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('sale_payments',
    sa.Column('sale_id', sa.UUID(), nullable=False),
    sa.Column('amount', sa.Numeric(precision=12, scale=2), nullable=False),
    sa.Column('payment_method', sa.String(length=50), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['sale_id'], ['sales.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('stock_adjustments',
    sa.Column('batch_id', sa.UUID(), nullable=False),
    sa.Column('branch_id', sa.UUID(), nullable=False),
    sa.Column('adjustment_type', sa.String(length=50), nullable=False),
    sa.Column('quantity_change', sa.Integer(), nullable=False),
    sa.Column('reason', sa.Text(), nullable=True),
    sa.Column('reference', sa.String(length=100), nullable=True),
    sa.Column('witnessed_by_id', sa.UUID(), nullable=True),
    sa.Column('created_by_id', sa.UUID(), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['branch_id'], ['branches.id'], ),
    sa.ForeignKeyConstraint(['created_by_id'], ['users.id'], ),
    sa.ForeignKeyConstraint(['witnessed_by_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('stock_count_items',
    sa.Column('stock_count_id', sa.UUID(), nullable=False),
    sa.Column('batch_id', sa.UUID(), nullable=False),
    sa.Column('system_qty', sa.Integer(), nullable=False),
    sa.Column('physical_qty', sa.Integer(), nullable=False),
    sa.Column('variance', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['stock_count_id'], ['stock_counts.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('stock_transfer_items',
    sa.Column('transfer_id', sa.UUID(), nullable=False),
    sa.Column('batch_id', sa.UUID(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['transfer_id'], ['stock_transfers.id'], ),
    sa.PrimaryKeyConstraint('id')
    )

    op.create_table('supplier_return_items',
    sa.Column('return_id', sa.UUID(), nullable=False),
    sa.Column('batch_id', sa.UUID(), nullable=False),
    sa.Column('quantity', sa.Integer(), nullable=False),
    sa.Column('reason', sa.String(length=100), nullable=True),
    sa.Column('id', sa.UUID(), nullable=False),
    sa.ForeignKeyConstraint(['batch_id'], ['medicine_batches.id'], ),
    sa.ForeignKeyConstraint(['return_id'], ['supplier_returns.id'], ),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('supplier_return_items')
    op.drop_table('stock_transfer_items')
    op.drop_table('stock_count_items')
    op.drop_table('stock_adjustments')
    op.drop_table('sale_payments')
    op.drop_table('sale_items')
    op.drop_table('grn_items')
    op.drop_table('prescription_items')
    op.drop_table('medicine_batches')
    op.drop_constraint('fk_sales_insurance_claim_id', 'sales', type_='foreignkey')
    op.drop_table('insurance_claims')
    op.drop_index(op.f('ix_sales_invoice_number'), table_name='sales')
    op.drop_table('sales')
    op.drop_table('prescriptions')
    op.drop_table('po_items')
    op.drop_table('notification_logs')
    op.drop_table('grns')
    op.drop_table('supplier_returns')
    op.drop_table('supplier_payments')
    op.drop_table('stock_transfers')
    op.drop_table('stock_counts')
    op.drop_table('purchase_orders')
    op.drop_table('printer_configs')
    op.drop_index(op.f('ix_patients_phone'), table_name='patients')
    op.drop_index(op.f('ix_patients_name'), table_name='patients')
    op.drop_index(op.f('ix_patients_cnic'), table_name='patients')
    op.drop_table('patients')
    op.drop_table('notifications')
    op.drop_table('notification_preferences')
    op.drop_table('medicine_price_history')
    op.drop_table('audit_logs')
    op.drop_constraint('fk_users_branch_id', 'users', type_='foreignkey')
    op.drop_table('branches')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
    op.drop_table('system_settings')
    op.drop_index(op.f('ix_suppliers_name'), table_name='suppliers')
    op.drop_table('suppliers')
    op.drop_table('notification_templates')
    op.drop_index(op.f('ix_medicines_name'), table_name='medicines')
    op.drop_index(op.f('ix_medicines_generic_name'), table_name='medicines')
    op.drop_index(op.f('ix_medicines_category'), table_name='medicines')
    op.drop_index(op.f('ix_medicines_barcode'), table_name='medicines')
    op.drop_table('medicines')
    op.drop_table('insurance_providers')
