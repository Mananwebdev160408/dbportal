import { describe, it, expect } from "vitest";
import { inferVirtualForeignKeys } from "../drivers/mongodb-driver.js";
import type { TableSchema } from "../drivers/types.js";

describe("inferVirtualForeignKeys", () => {
  it("should match standard singular/plural references", () => {
    const tables: TableSchema[] = [
      {
        name: "posts",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          {
            name: "title",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
      {
        name: "comments",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          {
            name: "postId",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
          {
            name: "post_id",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
          {
            name: "post_ids",
            type: "array",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const commentTable = result.find((t) => t.name === "comments")!;

    expect(commentTable.foreignKeys).toHaveLength(3);
    expect(commentTable.foreignKeys).toContainEqual({
      table: "comments",
      column: "postId",
      refTable: "posts",
      refColumn: "_id",
    });
    expect(commentTable.foreignKeys).toContainEqual({
      table: "comments",
      column: "post_id",
      refTable: "posts",
      refColumn: "_id",
    });
    expect(commentTable.foreignKeys).toContainEqual({
      table: "comments",
      column: "post_ids",
      refTable: "posts",
      refColumn: "_id",
    });
  });

  it("should resolve common reference aliases like author or owner to users", () => {
    const tables: TableSchema[] = [
      {
        name: "users",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          {
            name: "username",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
      {
        name: "posts",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          {
            name: "authorId",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
          {
            name: "owner_id",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const postTable = result.find((t) => t.name === "posts")!;

    expect(postTable.foreignKeys).toHaveLength(2);
    expect(postTable.foreignKeys).toContainEqual({
      table: "posts",
      column: "authorId",
      refTable: "users",
      refColumn: "_id",
    });
    expect(postTable.foreignKeys).toContainEqual({
      table: "posts",
      column: "owner_id",
      refTable: "users",
      refColumn: "_id",
    });
  });

  it("should handle self-referencing fields like parentId", () => {
    const tables: TableSchema[] = [
      {
        name: "comments",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          {
            name: "parentId",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const commentTable = result.find((t) => t.name === "comments")!;

    expect(commentTable.foreignKeys).toHaveLength(1);
    expect(commentTable.foreignKeys[0]).toEqual({
      table: "comments",
      column: "parentId",
      refTable: "comments",
      refColumn: "_id",
    });
  });

  it("should map fields that match a collection name directly without id suffix", () => {
    const tables: TableSchema[] = [
      {
        name: "users",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
        ],
        foreignKeys: [],
      },
      {
        name: "profiles",
        columns: [
          { name: "_id", type: "string", isNullable: false, isPrimary: true },
          { name: "user", type: "object", isNullable: false, isPrimary: false },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const profileTable = result.find((t) => t.name === "profiles")!;

    expect(profileTable.foreignKeys).toHaveLength(1);
    expect(profileTable.foreignKeys[0]).toEqual({
      table: "profiles",
      column: "user",
      refTable: "users",
      refColumn: "_id",
    });
  });

  it("should NOT map direct name matches if the type is primitive (e.g. string)", () => {
    const tables: TableSchema[] = [
      {
        name: "comments",
        columns: [
          { name: "_id", type: "object", isNullable: false, isPrimary: true },
          {
            name: "comment",
            type: "string",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const commentTable = result.find((t) => t.name === "comments")!;
    expect(commentTable.foreignKeys).toHaveLength(0);
  });

  it("should map suffix matching for nested collections and custom aliases", () => {
    const tables: TableSchema[] = [
      {
        name: "stories",
        columns: [
          { name: "_id", type: "object", isNullable: false, isPrimary: true },
        ],
        foreignKeys: [],
      },
      {
        name: "users",
        columns: [
          { name: "_id", type: "object", isNullable: false, isPrimary: true },
        ],
        foreignKeys: [],
      },
      {
        name: "storyviewers",
        columns: [
          { name: "_id", type: "object", isNullable: false, isPrimary: true },
          {
            name: "viewedstory",
            type: "object",
            isNullable: false,
            isPrimary: false,
          },
          {
            name: "commentedby",
            type: "object",
            isNullable: false,
            isPrimary: false,
          },
        ],
        foreignKeys: [],
      },
    ];

    const result = inferVirtualForeignKeys(tables);
    const viewerTable = result.find((t) => t.name === "storyviewers")!;
    expect(viewerTable.foreignKeys).toHaveLength(2);
    expect(viewerTable.foreignKeys).toContainEqual({
      table: "storyviewers",
      column: "viewedstory",
      refTable: "stories",
      refColumn: "_id",
    });
    expect(viewerTable.foreignKeys).toContainEqual({
      table: "storyviewers",
      column: "commentedby",
      refTable: "users",
      refColumn: "_id",
    });
  });
});
