require 'active_record/connection_adapters/postgresql_adapter'

ActiveSupport.on_load(:active_record) do
  module ActiveRecord
    module ConnectionAdapters
      class PostgreSQLAdapter
        private

        def translate_exception(exception, message:, sql:, binds:)
          return exception unless exception.respond_to?(:result)

          case exception.result.try(:error_field, PG::PG_DIAG_SQLSTATE)
          when nil
            if exception.message.match?(/connection is closed/i) || exception.message.match?(/no connection to the server/i)
              ConnectionNotEstablished.new(exception)
            else
              super
            end
          when UNIQUE_VIOLATION
            RecordNotUnique.new(message, sql: sql, binds: binds)
          when FOREIGN_KEY_VIOLATION
            InvalidForeignKey.new(message, sql: sql, binds: binds)
          when VALUE_LIMIT_VIOLATION
            ValueTooLong.new(message, sql: sql, binds: binds)
          when NUMERIC_VALUE_OUT_OF_RANGE
            RangeError.new(message, sql: sql, binds: binds)
          when NOT_NULL_VIOLATION
            NotNullViolation.new(message, sql: sql, binds: binds)
          when SERIALIZATION_FAILURE
            SerializationFailure.new(message, sql: sql, binds: binds)
          when DEADLOCK_DETECTED
            Deadlocked.new(message, sql: sql, binds: binds)
          when DUPLICATE_DATABASE
            DatabaseAlreadyExists.new(message, sql: sql, binds: binds)
          when LOCK_NOT_AVAILABLE
            LockWaitTimeout.new(message, sql: sql, binds: binds)
          when QUERY_CANCELED
            QueryCanceled.new(message, sql: sql, binds: binds)
          else
            super
          end
        end
      end
    end
  end
end
