/**
 * Integration tests for MCP Memory using cloudflare:test
 * Tests against actual D1 database in Workers runtime
 *
 * Note: Vectorize tests are skipped in local testing because Vectorize
 * requires production binding (--experimental-vectorize-bind-to-prod)
 */

import { describe, it, expect, beforeEach } from "vitest"
import { env } from "cloudflare:test"
import { initializeDatabase, storeMemoryInD1, deleteMemoryFromD1, updateMemoryInD1 } from "../../src/utils/db"

const TEST_NAMESPACE = "test:integration"

describe("Memory storage (integration)", () => {
	beforeEach(async () => {
		// Initialize database schema
		await initializeDatabase(env)

		// Clean up test namespace before each test
		await env.DB.prepare("DELETE FROM memories WHERE namespace = ?")
			.bind(TEST_NAMESPACE)
			.run()
	})

	describe("D1 database operations", () => {
		it("should store a memory in D1", async () => {
			const content = "Test memory content"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env)

			expect(memoryId).toBeDefined()
			expect(typeof memoryId).toBe("string")

			// Verify it was stored
			const result = await env.DB.prepare(
				"SELECT content FROM memories WHERE id = ? AND namespace = ?"
			).bind(memoryId, TEST_NAMESPACE).first<{ content: string }>()

			expect(result?.content).toBe(content)
		})

		it("should store memory with custom ID", async () => {
			const content = "Custom ID memory"
			const customId = "custom-test-id-123"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env, customId)

			expect(memoryId).toBe(customId)

			const result = await env.DB.prepare(
				"SELECT content FROM memories WHERE id = ?"
			).bind(customId).first<{ content: string }>()

			expect(result?.content).toBe(content)
		})

		it("should soft delete a memory from D1", async () => {
			const content = "Memory to delete"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env)

			await deleteMemoryFromD1(memoryId, TEST_NAMESPACE, env)

			// Verify it's soft deleted (deleted_at is set)
			const result = await env.DB.prepare(
				"SELECT deleted_at FROM memories WHERE id = ?"
			).bind(memoryId).first<{ deleted_at: string | null }>()

			expect(result?.deleted_at).not.toBeNull()
		})

		it("should not find soft-deleted memories in active queries", async () => {
			const content = "Will be deleted"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env)

			await deleteMemoryFromD1(memoryId, TEST_NAMESPACE, env)

			// Query for active memories should not include deleted ones
			const result = await env.DB.prepare(
				"SELECT * FROM memories WHERE id = ? AND deleted_at IS NULL"
			).bind(memoryId).first()

			expect(result).toBeNull()
		})

		it("should update a memory in D1", async () => {
			const originalContent = "Original content"
			const updatedContent = "Updated content"
			const memoryId = await storeMemoryInD1(originalContent, TEST_NAMESPACE, env)

			await updateMemoryInD1(memoryId, TEST_NAMESPACE, updatedContent, env)

			const result = await env.DB.prepare(
				"SELECT content FROM memories WHERE id = ?"
			).bind(memoryId).first<{ content: string }>()

			expect(result?.content).toBe(updatedContent)
		})

		it("should throw when updating non-existent memory", async () => {
			await expect(
				updateMemoryInD1("non-existent-id", TEST_NAMESPACE, "content", env)
			).rejects.toThrow()
		})

		it("should not update a deleted memory", async () => {
			const content = "Will be deleted then updated"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env)

			await deleteMemoryFromD1(memoryId, TEST_NAMESPACE, env)

			// Updating a deleted memory should throw
			await expect(
				updateMemoryInD1(memoryId, TEST_NAMESPACE, "new content", env)
			).rejects.toThrow()
		})
	})

	describe("Namespace isolation", () => {
		it("should isolate memories by namespace in D1", async () => {
			const namespace1 = "test:ns1"
			const namespace2 = "test:ns2"
			const content1 = "Content for namespace 1"
			const content2 = "Content for namespace 2"

			await storeMemoryInD1(content1, namespace1, env)
			await storeMemoryInD1(content2, namespace2, env)

			// Query namespace1 should only return its content
			const results1 = await env.DB.prepare(
				"SELECT content FROM memories WHERE namespace = ? AND deleted_at IS NULL"
			).bind(namespace1).all()

			expect(results1.results.length).toBe(1)
			expect((results1.results[0] as any).content).toBe(content1)

			// Query namespace2 should only return its content
			const results2 = await env.DB.prepare(
				"SELECT content FROM memories WHERE namespace = ? AND deleted_at IS NULL"
			).bind(namespace2).all()

			expect(results2.results.length).toBe(1)
			expect((results2.results[0] as any).content).toBe(content2)
		})

		it("should delete from correct namespace only", async () => {
			const namespace1 = "test:del1"
			const namespace2 = "test:del2"
			const content = "Same content different namespace"

			const id1 = await storeMemoryInD1(content, namespace1, env)
			const id2 = await storeMemoryInD1(content, namespace2, env)

			// Delete from namespace1
			await deleteMemoryFromD1(id1, namespace1, env)

			// namespace1 memory should be deleted
			const result1 = await env.DB.prepare(
				"SELECT deleted_at FROM memories WHERE id = ?"
			).bind(id1).first<{ deleted_at: string | null }>()
			expect(result1?.deleted_at).not.toBeNull()

			// namespace2 memory should still be active
			const result2 = await env.DB.prepare(
				"SELECT deleted_at FROM memories WHERE id = ?"
			).bind(id2).first<{ deleted_at: string | null }>()
			expect(result2?.deleted_at).toBeNull()
		})
	})

	describe("Database schema", () => {
		it("should have created_at timestamp", async () => {
			const content = "Memory with timestamp"
			const memoryId = await storeMemoryInD1(content, TEST_NAMESPACE, env)

			const result = await env.DB.prepare(
				"SELECT created_at FROM memories WHERE id = ?"
			).bind(memoryId).first<{ created_at: string }>()

			expect(result?.created_at).toBeDefined()
			// Should be a valid ISO timestamp
			expect(new Date(result!.created_at).getTime()).not.toBeNaN()
		})

		it("should have system_metadata table", async () => {
			// Insert a test value
			await env.DB.prepare(
				"INSERT OR REPLACE INTO system_metadata (key, value) VALUES (?, ?)"
			).bind("test_key", "test_value").run()

			const result = await env.DB.prepare(
				"SELECT value FROM system_metadata WHERE key = ?"
			).bind("test_key").first<{ value: string }>()

			expect(result?.value).toBe("test_value")
		})

		it("should have vector_sync table", async () => {
			const memoryId = "sync-test-id"
			const syncTime = new Date().toISOString()

			await env.DB.prepare(
				"INSERT INTO vector_sync (memory_id, synced_at) VALUES (?, ?)"
			).bind(memoryId, syncTime).run()

			const result = await env.DB.prepare(
				"SELECT synced_at FROM vector_sync WHERE memory_id = ?"
			).bind(memoryId).first<{ synced_at: string }>()

			expect(result?.synced_at).toBe(syncTime)
		})
	})
})
