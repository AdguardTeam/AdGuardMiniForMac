# coding: utf8
import logging
import helper
import sys

if __name__ == '__main__':
    helper.configure()
    logger = logging.getLogger(__name__)

    try:
        import validator
        import code_generator_abstract_language
        import constants

        args = helper.get_args()
        validator.validate_args(args)

        for language in args.languages:
            for file_type in (constants.TYPE_SERVICES, constants.TYPE_TYPES, constants.TYPE_CALLBACKS):
                logger.info("Generate %s files for %s language",
                    file_type,
                    language)
                code_generator_abstract_language.generate(language, args.input_dir, args.output_dir, file_type)

    except Exception:
        logger.exception('proto schema generation failed')
        sys.exit(1)
