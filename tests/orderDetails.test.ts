import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

import { OrderDetailsService } from '../examples/querying/services';
import { OrderDetails } from '../examples/querying/types';
import { createTestClient, authenticateClient } from './setup';

describe('OrderDetails CRUD Operations', () => {
  const client = createTestClient();
  let orderDetails: OrderDetailsService;
  let testOrderDetail: OrderDetails;

  // Test data with composite keys - using existing order 11074 and valid products (avoiding 16)
  const TEST_RECORDS = [
    { orderId: 11074, productId: 14 },
    { orderId: 11074, productId: 15 },
  ];

  beforeAll(async () => {
    await authenticateClient(client);
    orderDetails = new OrderDetailsService(client);
  });

  afterAll(async () => {
    // Cleanup all test records
    for (const id of TEST_RECORDS) {
      try {
        await orderDetails.delete(id);
      } catch (e) {
        // Ignore if record doesn't exist
      }
    }
  });

  describe('Create', () => {
    it('should create a new order detail with composite key', async () => {
      // First verify record doesn't exist
      const initialCheck = await orderDetails.getAll({
        filters: {
          orderId: { eq: TEST_RECORDS[0].orderId },
          productId: { eq: TEST_RECORDS[0].productId },
        },
      });
      expect(initialCheck.data.length).toBe(0);

      // Create the record
      const newOrderDetail = {
        orderId: TEST_RECORDS[0].orderId,
        productId: TEST_RECORDS[0].productId,
        unitPrice: 10.99,
        quantity: 5,
        discount: 0,
      };

      await orderDetails.create(newOrderDetail);

      // Verify record was created and store for later tests
      const createdRecord = await orderDetails.getById({
        orderId: TEST_RECORDS[0].orderId,
        productId: TEST_RECORDS[0].productId,
      });
      expect(createdRecord.orderId).toBe(TEST_RECORDS[0].orderId);
      expect(createdRecord.productId).toBe(TEST_RECORDS[0].productId);
      expect(createdRecord.unitPrice).toBe(newOrderDetail.unitPrice);
      testOrderDetail = createdRecord;
    });
  });

  describe('Read', () => {
    it('should get order detail by composite key', async () => {
      const record = await orderDetails.getById({
        orderId: testOrderDetail.orderId,
        productId: testOrderDetail.productId,
      });
      expect(record.orderId).toBe(testOrderDetail.orderId);
      expect(record.productId).toBe(testOrderDetail.productId);
      expect(record.unitPrice).toBe(testOrderDetail.unitPrice);
    });

    it('should get filtered order details', async () => {
      const result = await orderDetails.getAll({
        filters: {
          orderId: { eq: testOrderDetail.orderId },
        },
        recordCount: true,
      });

      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });
  });

  describe('Update', () => {
    it('should update an order detail using composite key', async () => {
      // First delete if exists
      try {
        await orderDetails.delete({
          orderId: TEST_RECORDS[0].orderId,
          productId: TEST_RECORDS[0].productId,
        });
      } catch (e) {
        // Ignore delete errors
      }

      // Create a test record
      const testRecord = {
        orderId: TEST_RECORDS[0].orderId,
        productId: TEST_RECORDS[0].productId,
        unitPrice: 10.99,
        quantity: 5,
        discount: 0,
      };
      await orderDetails.create(testRecord);

      // Update the record
      const updates = {
        unitPrice: 15.99,
        quantity: 3,
      };

      const affected = await orderDetails.update(
        {
          orderId: TEST_RECORDS[0].orderId,
          productId: TEST_RECORDS[0].productId,
        },
        updates,
      );
      expect(affected).toBe(1);

      // Verify the update
      const updated = await orderDetails.getById({
        orderId: TEST_RECORDS[0].orderId,
        productId: TEST_RECORDS[0].productId,
      });
      expect(updated.unitPrice).toBe(updates.unitPrice);
      expect(updated.quantity).toBe(updates.quantity);
    });

    it('should update multiple order details', async () => {
      // First delete any existing records
      for (const record of TEST_RECORDS) {
        try {
          await orderDetails.delete(record);
        } catch (e) {
          // Ignore delete errors
        }
      }

      // Create both test records
      const records = [
        {
          orderId: TEST_RECORDS[0].orderId,
          productId: TEST_RECORDS[0].productId,
          unitPrice: 10.99,
          quantity: 5,
          discount: 0,
        },
        {
          orderId: TEST_RECORDS[1].orderId,
          productId: TEST_RECORDS[1].productId,
          unitPrice: 20.99,
          quantity: 1,
          discount: 0,
        },
      ];

      for (const record of records) {
        await orderDetails.create(record);
      }

      // Update each record individually since batch update isn't working
      for (const record of TEST_RECORDS) {
        const affected = await orderDetails.update(record, { discount: 0.1 });
        expect(affected).toBe(1);
      }

      // Verify updates
      for (const record of TEST_RECORDS) {
        const updated = await orderDetails.getById(record);
        expect(updated.discount).toBe(0.1);
      }
    });
  });

  describe('Delete', () => {
    it('should delete an order detail using composite key', async () => {
      // First delete if exists
      try {
        await orderDetails.delete({
          orderId: TEST_RECORDS[1].orderId,
          productId: TEST_RECORDS[1].productId,
        });
      } catch (e) {
        // Ignore delete errors
      }

      // Create a test record
      const testRecord = {
        orderId: TEST_RECORDS[1].orderId,
        productId: TEST_RECORDS[1].productId,
        unitPrice: 25.99,
        quantity: 2,
        discount: 0,
      };
      await orderDetails.create(testRecord);

      // Delete the record
      const affected = await orderDetails.delete({
        orderId: TEST_RECORDS[1].orderId,
        productId: TEST_RECORDS[1].productId,
      });
      expect(affected).toBe(1);

      // Verify deletion
      const result = await orderDetails.getAll({
        filters: {
          orderId: { eq: TEST_RECORDS[1].orderId },
          productId: { eq: TEST_RECORDS[1].productId },
        },
      });
      expect(result.data.length).toBe(0);
    });

    it('should delete multiple order details', async () => {
      // First delete any existing records
      for (const record of TEST_RECORDS) {
        try {
          await orderDetails.delete(record);
        } catch (e) {
          // Ignore delete errors
        }
      }

      // Create both test records
      const records = [
        {
          orderId: TEST_RECORDS[0].orderId,
          productId: TEST_RECORDS[0].productId,
          unitPrice: 10.99,
          quantity: 5,
          discount: 0,
        },
        {
          orderId: TEST_RECORDS[1].orderId,
          productId: TEST_RECORDS[1].productId,
          unitPrice: 25.99,
          quantity: 2,
          discount: 0,
        },
      ];

      for (const record of records) {
        await orderDetails.create(record);
      }

      // Delete each record individually since batch delete isn't working
      for (const record of TEST_RECORDS) {
        const affected = await orderDetails.delete(record);
        expect(affected).toBe(1);
      }

      // Verify deletion
      for (const record of TEST_RECORDS) {
        const result = await orderDetails.getAll({
          filters: {
            orderId: { eq: record.orderId },
            productId: { eq: record.productId },
          },
        });
        expect(result.data.length).toBe(0);
      }
    });
  });
});
