import type { MigrationInterface, QueryRunner } from 'typeorm';

import { TableCheck, TableColumn } from 'typeorm';

export class AddAuthenticationFieldsToUsers1795823323718 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'password_hash',
                type: 'varchar',
                length: '255',
                isNullable: false,
            }),
        );

        await queryRunner.addColumn(
            'users',
            new TableColumn({
                name: 'is_active',
                type: 'boolean',
                isNullable: false,
                default: true,
            }),
        );

        await queryRunner.dropCheckConstraint('users', 'CHK_users_role');

        await queryRunner.createCheckConstraint(
            'users',
            new TableCheck({
                name: 'CHK_users_role',
                expression: `"role" IN ('user', 'agent', 'admin')`,
            }),
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropCheckConstraint('users', 'CHK_users_role');

        await queryRunner.createCheckConstraint(
            'users',
            new TableCheck({
                name: 'CHK_users_role',
                expression: `"role" IN ('user', 'agent')`,
            }),
        );

        await queryRunner.dropColumn('users', 'is_active');
        await queryRunner.dropColumn('users', 'password_hash');
    }
}
