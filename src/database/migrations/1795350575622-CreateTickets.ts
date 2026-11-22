import type { MigrationInterface, QueryRunner } from 'typeorm';
import { Table, TableForeignKey } from 'typeorm';

export class CreateTickets1795350575622 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.createTable(
            new Table({
                name: 'tickets',
                columns: [
                    {
                        name: 'id',
                        type: 'integer',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '100',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: false,
                    },
                    {
                        name: 'priority',
                        type: 'varchar',
                        length: '10',
                        default: "'medium'",
                        isNullable: false,
                    },
                    {
                        name: 'status',
                        type: 'varchar',
                        length: '20',
                        default: "'open'",
                        isNullable: false,
                    },
                    {
                        name: 'created_by',
                        type: 'integer',
                        isNullable: false,
                    },
                    {
                        name: 'assigned_agent_id',
                        type: 'integer',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamptz',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamptz',
                        default: 'CURRENT_TIMESTAMP',
                        isNullable: false,
                    },
                ],
                checks: [
                    {
                        name: 'CHK_tickets_priority',
                        expression: `"priority" IN ('low', 'medium', 'high')`,
                    },
                    {
                        name: 'CHK_tickets_status',
                        expression: `"status" IN ('open', 'in_progress', 'closed')`,
                    },
                ],
            }),
        );

        await queryRunner.createForeignKeys('tickets', [
            new TableForeignKey({
                name: 'FK_tickets_created_by',
                columnNames: ['created_by'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            }),
            new TableForeignKey({
                name: 'FK_tickets_assigned_agent',
                columnNames: ['assigned_agent_id'],
                referencedTableName: 'users',
                referencedColumnNames: ['id'],
                onDelete: 'RESTRICT',
                onUpdate: 'RESTRICT',
            }),
        ]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropTable('tickets');
    }
}
